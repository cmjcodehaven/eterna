import { useEffect, useRef } from "react";

interface PolaroidFrameProps {
  /** Data URL ou URL pública da foto base */
  imageSrc: string;
  /** Nome carimbado na base da moldura */
  guestName?: string;
  /** ISO string para formatar a data na base */
  capturedAt?: string;
  /** Largura total do canvas em pixels (padrão 400) */
  pixelWidth?: number;
  /**
   * Chamado uma vez, após o canvas ser renderizado.
   * Recebe o dataUrl final com a moldura baked-in.
   */
  onCanvasReady?: (dataUrl: string) => void;
  className?: string;
}

export default function PolaroidFrame({
  imageSrc,
  guestName,
  capturedAt,
  pixelWidth = 400,
  onCanvasReady,
  className,
}: PolaroidFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Ref estável para o callback — evita re-triggers desnecessários do useEffect
  const onReadyRef = useRef(onCanvasReady);
  useEffect(() => {
    onReadyRef.current = onCanvasReady;
  }, [onCanvasReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // ── Proporções clássicas de Polaroid ──────────────────────
      const SIDE = Math.round(pixelWidth * 0.056);   // margem lateral
      const TOP  = Math.round(pixelWidth * 0.056);   // margem superior
      const BOT  = Math.round(pixelWidth * 0.22);    // base maior (espaço do texto)
      const PHOTO = pixelWidth - SIDE * 2;           // área quadrada da foto
      const HEIGHT = TOP + PHOTO + BOT;

      canvas.width  = pixelWidth;
      canvas.height = HEIGHT;

      // Fundo off-white pergaminho
      ctx.fillStyle = "#f5f0e8";
      ctx.fillRect(0, 0, pixelWidth, HEIGHT);

      // Sombra interna sutil ao redor da foto
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      ctx.fillRect(SIDE - 3, TOP - 3, PHOTO + 6, PHOTO + 6);

      // Foto com center-crop quadrado
      const scale = Math.max(PHOTO / img.naturalWidth, PHOTO / img.naturalHeight);
      const sw = PHOTO / scale;
      const sh = PHOTO / scale;
      const sx = (img.naturalWidth  - sw) / 2;
      const sy = (img.naturalHeight - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, SIDE, TOP, PHOTO, PHOTO);

      // ── Texto na base ─────────────────────────────────────────
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";

      if (guestName) {
        ctx.fillStyle = "#3a3020";
        ctx.font = `italic ${Math.round(BOT * 0.36)}px Georgia, "Times New Roman", serif`;

        // Trunca nomes longos para caber dentro da moldura
        const maxW = pixelWidth - SIDE * 4;
        let label = guestName;
        while (ctx.measureText(label).width > maxW && label.length > 4) {
          label = label.slice(0, -1);
        }
        if (label !== guestName) label += "…";

        ctx.fillText(label, pixelWidth / 2, TOP + PHOTO + BOT * 0.44);
      }

      if (capturedAt) {
        const dateStr = new Date(capturedAt).toLocaleDateString("pt-BR", {
          day:   "2-digit",
          month: "2-digit",
          year:  "numeric",
        });
        ctx.fillStyle = "#9a8a6a";
        ctx.font = `${Math.round(BOT * 0.22)}px Georgia, "Times New Roman", serif`;
        ctx.fillText(dateStr, pixelWidth / 2, TOP + PHOTO + BOT * 0.74);
      }

      onReadyRef.current?.(canvas.toDataURL("image/jpeg", 0.92));
    };

    img.onerror = () => {
      canvas.width  = pixelWidth;
      canvas.height = Math.round(pixelWidth * 1.3);
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(201,162,77,0.4)";
      ctx.font = "13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Foto indisponível", pixelWidth / 2, canvas.height / 2);
      // Notifica o pai mesmo em erro — evita isSaving preso para sempre
      onReadyRef.current?.(canvas.toDataURL("image/jpeg", 0.92));
    };

    img.src = imageSrc;
  }, [imageSrc, guestName, capturedAt, pixelWidth]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    />
  );
}
