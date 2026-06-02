import JSZip from "jszip";

export interface PhotoToZip {
  url: string;
  guestName: string;
  filename: string;
}

const BATCH_SIZE = 10;

export async function downloadZip(
  photos: PhotoToZip[],
  zipName: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const zip = new JSZip();
  let fetched = 0;

  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (photo) => {
        const res = await fetch(photo.url);
        if (!res.ok) throw new Error(`Falha ao baixar ${photo.filename}`);
        const blob = await res.blob();
        const folder = zip.folder(sanitizeFolderName(photo.guestName)) ?? zip;
        folder.file(photo.filename, blob);
        fetched++;
        onProgress?.(Math.round((fetched / photos.length) * 85));
      })
    );
  }

  onProgress?.(90);
  const content = await zip.generateAsync({ type: "blob" });
  onProgress?.(100);

  const url = URL.createObjectURL(content);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function sanitizeFolderName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "Convidado";
}
