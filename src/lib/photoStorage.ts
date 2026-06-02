import localforage from "localforage";
import type { PendingPhoto } from "@/types/domain";

// Instância isolada para não colidir com outros usos de localforage
const photoStore = localforage.createInstance({
  name: "eterna-photos",
  storeName: "pending_photos",
  description: "Fotos capturadas aguardando envio ao servidor",
});

function key(eventId: string, guestId: string): string {
  return `${eventId}:${guestId}`;
}

export async function savePendingPhoto(
  eventId: string,
  guestId: string,
  dataUrl: string
): Promise<PendingPhoto> {
  const photo: PendingPhoto = {
    localId: crypto.randomUUID(),
    dataUrl,
    capturedAt: new Date().toISOString(),
  };
  const existing = await listPendingPhotos(eventId, guestId);
  await photoStore.setItem(key(eventId, guestId), [...existing, photo]);
  return photo;
}

export async function listPendingPhotos(
  eventId: string,
  guestId: string
): Promise<PendingPhoto[]> {
  const stored = await photoStore.getItem<PendingPhoto[]>(key(eventId, guestId));
  return stored ?? [];
}

export async function deletePendingPhoto(
  eventId: string,
  guestId: string,
  localId: string
): Promise<void> {
  const existing = await listPendingPhotos(eventId, guestId);
  const updated = existing.filter((p) => p.localId !== localId);
  await photoStore.setItem(key(eventId, guestId), updated);
}

// Chamada SOMENTE após upload confirmado com sucesso no servidor
export async function clearPendingPhotos(
  eventId: string,
  guestId: string
): Promise<void> {
  await photoStore.removeItem(key(eventId, guestId));
}

export async function countPendingPhotos(
  eventId: string,
  guestId: string
): Promise<number> {
  const photos = await listPendingPhotos(eventId, guestId);
  return photos.length;
}
