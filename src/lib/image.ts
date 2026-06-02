/**
 * Converte um Data URL (base64) para Blob binário.
 * Usado antes de enviar fotos via FormData para a Edge Function.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new Error("Imagem corrompida. Descarte a foto e tente novamente.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
