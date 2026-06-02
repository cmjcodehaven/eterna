import { supabase } from "@/integrations/supabase/client";
import type { PhotoItem } from "@/types/domain";
import type { Tables } from "@/integrations/supabase/types";

export async function fetchEventId(slug: string): Promise<string> {
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .single();

  if (error || !data) throw new Error("Evento não encontrado.");
  return (data as unknown as { id: string }).id;
}

export async function listEventPhotos(eventId: string): Promise<PhotoItem[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as Tables<"photos">[]).map((row) => ({
    id:               row.id,
    eventId:          row.event_id,
    guestId:          row.guest_id,
    guestName:        row.guest_name,
    guestPhoneDigits: row.guest_phone_digits,
    storagePath:      row.storage_path,
    selected:         row.selected,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedAt:       row.selected_at ?? undefined,
    createdAt:        row.created_at,
  }));
}

// Cache de URLs assinadas — evita re-assinar paths já válidos
const _urlCache = new Map<string, { url: string; expiresAt: number }>();
const _URL_TTL  = 50 * 60 * 1000; // 50 min (Supabase assina por 60 min)

// Batch-sign up to 500 paths at once; returns { storagePath → signedUrl }
export async function signPhotos(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const result: Record<string, string> = {};
  const missing: string[] = [];
  const now = Date.now();

  for (const path of paths) {
    const cached = _urlCache.get(path);
    if (cached && cached.expiresAt > now) {
      result[path] = cached.url;
    } else {
      missing.push(path);
    }
  }

  if (missing.length === 0) return result;

  const { data, error } = await supabase.storage
    .from("event-photos")
    .createSignedUrls(missing, 3600);

  if (error) throw error;

  const expiresAt = now + _URL_TTL;
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) {
      result[item.path] = item.signedUrl;
      _urlCache.set(item.path, { url: item.signedUrl, expiresAt });
    }
  }
  return result;
}

export async function togglePhotoSelection(
  photoId: string,
  selected: boolean
): Promise<void> {
  const { error } = await supabase
    .from("photos")
    .update({ selected, selected_at: selected ? new Date().toISOString() : null } as unknown as never)
    .eq("id", photoId);

  if (error) throw error;
}

export async function listEventGuests(eventId: string) {
  const { data, error } = await supabase
    .from("guests")
    .select("id, name, phone_digits, guest_type, photo_limit")
    .eq("event_id", eventId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function addGuest(params: {
  eventId: string;
  name: string;
  phoneDigits: string;
  guestType: "guest" | "sponsor";
  photoLimit: number;
}): Promise<void> {
  const { error } = await supabase.from("guests").insert({
    event_id:    params.eventId,
    name:        params.name,
    phone_digits: params.phoneDigits,
    guest_type:  params.guestType,
    photo_limit: params.photoLimit,
  } as unknown as never);

  if (error) throw new Error(error.message);
}
