import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type EventRow = Tables<"events">;
export type GuestRow = Tables<"guests">;

// ── Eventos ───────────────────────────────────────────────────────────────────

export async function listAllEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createEvent(params: {
  name: string;
  slug: string;
  eventDate: string | null;
  defaultGuestPhotoLimit: number;
  defaultSponsorPhotoLimit: number;
}): Promise<EventRow> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      name:                        params.name,
      slug:                        params.slug,
      event_date:                  params.eventDate || null,
      default_guest_photo_limit:   params.defaultGuestPhotoLimit,
      default_sponsor_photo_limit: params.defaultSponsorPhotoLimit,
    } as unknown as never)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateEvent(
  eventId: string,
  updates: {
    name?: string;
    slug?: string;
    event_date?: string | null;
    default_guest_photo_limit?: number;
    default_sponsor_photo_limit?: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from("events")
    .update(updates as unknown as never)
    .eq("id", eventId);

  if (error) throw new Error(error.message);
}

// ── Estatísticas de evento ────────────────────────────────────────────────────

export interface EventStats {
  totalPhotos:    number;
  totalGuests:    number;
  selectedPhotos: number;
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  const [photosRes, guestsRes, selectedRes] = await Promise.all([
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("selected", true),
  ]);

  return {
    totalPhotos:    photosRes.count   ?? 0,
    totalGuests:    guestsRes.count   ?? 0,
    selectedPhotos: selectedRes.count ?? 0,
  };
}

// ── Atividade recente ─────────────────────────────────────────────────────────

export interface RecentPhotoEntry {
  id:          string;
  eventId:     string;
  guestName:   string;
  storagePath: string;
  createdAt:   string;
}

export async function getRecentPhotos(limit = 30): Promise<RecentPhotoEntry[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("id, event_id, guest_name, storage_path, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  type PhotoRow = { id: string; event_id: string; guest_name: string; storage_path: string; created_at: string };
  return ((data ?? []) as unknown as PhotoRow[]).map((row) => ({
    id:          row.id,
    eventId:     row.event_id,
    guestName:   row.guest_name,
    storagePath: row.storage_path,
    createdAt:   row.created_at,
  }));
}

// ── Convidados ────────────────────────────────────────────────────────────────

export async function listEventGuestsFull(eventId: string): Promise<GuestRow[]> {
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", eventId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

/** Contagem de fotos por convidado — retorna { guestId → count } */
export async function getPhotoCountsByGuest(
  eventId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("photos")
    .select("guest_id")
    .eq("event_id", eventId);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as unknown as Array<{ guest_id: string }>) {
    counts[row.guest_id] = (counts[row.guest_id] ?? 0) + 1;
  }
  return counts;
}

export async function updateGuestPhotoLimit(
  guestId: string,
  photoLimit: number
): Promise<void> {
  const { error } = await supabase
    .from("guests")
    .update({ photo_limit: photoLimit } as unknown as never)
    .eq("id", guestId);

  if (error) throw new Error(error.message);
}

// ── Utilitários ───────────────────────────────────────────────────────────────

/** "Casamento Márcio & Ana" → "casamento-marcio-ana" */
export function generateSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")   // remove combining diacritics (acentos)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min    = Math.floor(diffMs / 60_000);
  if (min < 1)  return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}


