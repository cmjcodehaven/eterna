import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ── Helpers ───────────────────────────────────────────────────

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidPhone(digits: string): boolean {
  return digits.length >= 10 && digits.length <= 15;
}

function errResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Handler ───────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { eventSlug, phone } = body as {
      eventSlug?: string;
      phone?: string;
    };

    if (!eventSlug || !phone) {
      return errResponse("eventSlug e phone são obrigatórios.", 400);
    }

    const phoneDigits = normalizePhone(phone);
    if (!isValidPhone(phoneDigits)) {
      return errResponse(
        "Telefone inválido. Informe DDD + número (10 a 15 dígitos).",
        400
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca evento pelo slug
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id")
      .eq("slug", eventSlug)
      .single();

    if (eventErr || !event) {
      return errResponse("Evento não encontrado.", 404);
    }

    // Busca convidado por event_id + phone_digits
    const { data: guest, error: guestErr } = await supabase
      .from("guests")
      .select("id, event_id, name, phone_digits, guest_type, photo_limit")
      .eq("event_id", event.id)
      .eq("phone_digits", phoneDigits)
      .single();

    if (guestErr || !guest) {
      return errResponse(
        "Convidado não encontrado. Verifique o telefone ou fale com a recepção.",
        404
      );
    }

    // Contagem de fotos já enviadas (validação de limite no backend)
    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("guest_id", guest.id);

    return new Response(
      JSON.stringify({
        guest: {
          id:          guest.id,
          eventId:     guest.event_id,
          name:        guest.name,
          phoneDigits: guest.phone_digits,
          guestType:   guest.guest_type,
          photoLimit:  guest.photo_limit,
        },
        uploadedCount: count ?? 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[guest-login]", err);
    return errResponse("Erro interno. Tente novamente.", 500);
  }
});
