import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function errResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Parse FormData ───────────────────────────────────────────
    const form = await req.formData();

    const eventId = form.get("eventId");
    const guestId = form.get("guestId");
    const phone   = form.get("phone");
    const rawFiles = form.getAll("files");

    if (
      !eventId || typeof eventId !== "string" ||
      !guestId || typeof guestId !== "string" ||
      !phone   || typeof phone   !== "string"
    ) {
      return errResponse("Parâmetros obrigatórios ausentes.", 400);
    }

    const imageFiles = rawFiles.filter((f): f is File => f instanceof File);
    if (imageFiles.length === 0) {
      return errResponse("Nenhuma foto enviada.", 400);
    }

    const phoneDigits = normalizePhone(phone);
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      return errResponse("Telefone inválido.", 400);
    }

    // ── Cliente com service role (bypassa RLS) ───────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Verificação tripla do convidado ───────────────────────────
    // event_id + id + phone_digits: garante que o payload não foi adulterado
    const { data: guest, error: guestErr } = await supabase
      .from("guests")
      .select("id, name, phone_digits, photo_limit")
      .eq("event_id", eventId)
      .eq("id", guestId)
      .eq("phone_digits", phoneDigits)
      .single();

    if (guestErr || !guest) {
      return errResponse("Convidado não autorizado ou dados inválidos.", 403);
    }

    // ── Verificação de limite no backend ──────────────────────────
    const { count: existingCount } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("guest_id", guestId);

    const already = existingCount ?? 0;
    if (already + imageFiles.length > guest.photo_limit) {
      const remaining = Math.max(0, guest.photo_limit - already);
      // Log estruturado para monitoramento no painel Supabase
      console.warn("[submit-photos] limite_excedido", JSON.stringify({
        event_id:   eventId,
        guest_id:   guestId,
        guest_name: guest.name,
        uploaded:   already,
        requested:  imageFiles.length,
        limit:      guest.photo_limit,
        remaining,
        ts: new Date().toISOString(),
      }));
      return errResponse(
        `Limite excedido. Você pode enviar mais ${remaining} foto(s).`,
        422
      );
    }

    // ── Upload para o Storage (bucket privado) ────────────────────
    const uploadedPaths: string[] = [];

    for (const file of imageFiles) {
      const timestamp = Date.now();
      const uuid      = crypto.randomUUID();
      const ext       = file.type === "image/png" ? "png" : "jpg";
      const storagePath = `events/${eventId}/guests/${guestId}/${timestamp}-${uuid}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("event-photos")
        .upload(storagePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadErr) {
        console.error("[submit-photos] storage upload:", uploadErr);
        // Rollback: remove arquivos já enviados nesta requisição
        if (uploadedPaths.length > 0) {
          await supabase.storage.from("event-photos").remove(uploadedPaths);
        }
        return errResponse("Falha no upload. Tente novamente.", 500);
      }

      uploadedPaths.push(storagePath);
    }

    // ── Inserção em batch na tabela photos ────────────────────────
    const inserts = uploadedPaths.map((storagePath) => ({
      event_id:           eventId,
      guest_id:           guestId,
      guest_name:         guest.name,
      guest_phone_digits: guest.phone_digits,
      storage_path:       storagePath,
      selected:           false,
    }));

    const { error: insertErr } = await supabase
      .from("photos")
      .insert(inserts);

    if (insertErr) {
      console.error("[submit-photos] db insert:", insertErr);
      // Rollback: remove arquivos do storage se o insert falhou
      await supabase.storage.from("event-photos").remove(uploadedPaths);
      return errResponse("Falha ao registrar fotos. Tente novamente.", 500);
    }

    return new Response(
      JSON.stringify({ ok: true, uploaded: uploadedPaths.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[submit-photos]", err);
    return errResponse("Erro interno. Tente novamente.", 500);
  }
});
