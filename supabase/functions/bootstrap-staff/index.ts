/**
 * bootstrap-staff — cria usuários iniciais de staff no Supabase Auth
 *
 * Usar SOMENTE em desenvolvimento / primeira configuração.
 * Protegido por x-bootstrap-secret header.
 *
 * Exemplo de chamada:
 *   curl -X POST https://<ref>.supabase.co/functions/v1/bootstrap-staff \
 *     -H "x-bootstrap-secret: SEU_SEGREDO" \
 *     -H "Content-Type: application/json" \
 *     -d '{"adminEmail":"admin@eterna.app","adminPassword":"...",
 *           "coupleEmail":"casal@eterna.app","couplePassword":"..."}'
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Verificação do segredo ────────────────────────────────────
  const secret = req.headers.get("x-bootstrap-secret");
  if (!secret || secret !== Deno.env.get("BOOTSTRAP_SECRET")) {
    return new Response(JSON.stringify({ error: "Não autorizado." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { adminEmail, adminPassword, coupleEmail, couplePassword } =
      (await req.json()) as {
        adminEmail: string;
        adminPassword: string;
        coupleEmail: string;
        couplePassword: string;
      };

    if (!adminEmail || !adminPassword || !coupleEmail || !couplePassword) {
      return new Response(JSON.stringify({ error: "Dados incompletos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: Record<string, string> = {};

    // ── Cria admin ────────────────────────────────────────────────
    const { data: adminData, error: adminErr } =
      await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

    if (adminErr && !adminErr.message.includes("already been registered")) {
      throw new Error(`Admin: ${adminErr.message}`);
    }

    if (adminData?.user) {
      await supabase
        .from("user_roles")
        .upsert({ user_id: adminData.user.id, role: "admin" });
      results.admin = "criado";
    } else {
      results.admin = "já existia";
    }

    // ── Cria casal ────────────────────────────────────────────────
    const { data: coupleData, error: coupleErr } =
      await supabase.auth.admin.createUser({
        email: coupleEmail,
        password: couplePassword,
        email_confirm: true,
      });

    if (coupleErr && !coupleErr.message.includes("already been registered")) {
      throw new Error(`Casal: ${coupleErr.message}`);
    }

    if (coupleData?.user) {
      await supabase
        .from("user_roles")
        .upsert({ user_id: coupleData.user.id, role: "couple" });
      results.couple = "criado";
    } else {
      results.couple = "já existia";
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[bootstrap-staff]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
