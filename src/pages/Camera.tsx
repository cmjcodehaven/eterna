import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, Camera as CameraIcon, Images, Loader2, SwitchCamera } from "lucide-react";
import PolaroidFrame from "@/components/PolaroidFrame";
import { useGuest } from "@/contexts/GuestContext";
import { savePendingPhoto, countPendingPhotos } from "@/lib/photoStorage";
import { cn } from "@/lib/utils";

type CameraMode = "viewfinder" | "preview";
type FacingMode = "environment" | "user";

// Dimensão máxima ao capturar frame (balanceia qualidade × tamanho em storage)
const MAX_CAPTURE_DIM = 1024;

function captureRawFrame(video: HTMLVideoElement): string | null {
  if (video.readyState < 2 || !video.videoWidth) return null;

  const scale = Math.min(
    1,
    MAX_CAPTURE_DIM / Math.max(video.videoWidth, video.videoHeight)
  );
  const w = Math.round(video.videoWidth  * scale);
  const h = Math.round(video.videoHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.80);
}

export default function Camera() {
  const { guest, photosRemaining } = useGuest();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode]               = useState<CameraMode>("viewfinder");
  const [facingMode, setFacingMode]   = useState<FacingMode>("environment");
  const [capturedRaw, setCapturedRaw] = useState<string | null>(null);
  const [capturedAt, setCapturedAt]   = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSaving, setIsSaving]       = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isFlashing, setIsFlashing]   = useState(false);

  // Fotos restantes considerando pendentes locais
  const actualRemaining = Math.max(0, photosRemaining - pendingCount);

  // ── Inicializa câmera ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!guest) return;

    countPendingPhotos(guest.eventId, guest.id).then(setPendingCount);

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width:  { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        const denied =
          err instanceof DOMException && err.name === "NotAllowedError";
        setCameraError(
          denied
            ? "Permissão de câmera negada. Permita o acesso nas configurações do navegador."
            : "Não foi possível acessar a câmera neste dispositivo."
        );
      }
    }

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [guest, facingMode]);

  // ── Troca câmera ──────────────────────────────────────────────────────────
  function handleFlipCamera() {
    if (mode !== "viewfinder" || isSaving) return;
    setCameraError(null);
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  // ── Captura ────────────────────────────────────────────────────────────────
  function handleCapture() {
    if (mode !== "viewfinder" || actualRemaining <= 0 || isSaving) return;
    const video = videoRef.current;
    if (!video) return;

    const raw = captureRawFrame(video);
    if (!raw) {
      toast.error("Não foi possível capturar a imagem. Tente novamente.");
      return;
    }

    // Flash visual de obturador
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    setCapturedAt(new Date().toISOString());
    setCapturedRaw(raw);
    setMode("preview");
  }

  // ── Salva quando PolaroidFrame termina de renderizar no canvas ─────────────
  const handlePolaroidReady = useCallback(
    async (polaroidDataUrl: string) => {
      if (!guest || isSaving) return;
      setIsSaving(true);

      try {
        await savePendingPhoto(guest.eventId, guest.id, polaroidDataUrl);
        const newCount = pendingCount + 1;
        setPendingCount(newCount);
        toast.success(
          `Foto salva! ${newCount} pendente${newCount !== 1 ? "s" : ""} de envio.`
        );
        // Preview fica visível por 1.6s antes de voltar à câmera
        setTimeout(() => {
          setCapturedRaw(null);
          setMode("viewfinder");
        }, 1600);
      } catch {
        toast.error("Erro ao salvar foto. Tente novamente.");
        setCapturedRaw(null);
        setMode("viewfinder");
      } finally {
        setIsSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [guest, pendingCount] // isSaving não entra pois usamos o valor atual no closure
  );

  if (!guest) return null;

  return (
    <div className="luxe-frame overflow-hidden select-none">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="btn-ghost">
          <ChevronLeft size={14} />
          Voltar
        </button>
        <span className="photo-counter">
          {guest.uploadedCount}/{guest.photoLimit} enviadas
        </span>
      </div>

      {/* ── Viewfinder (quadrado) ────────────────────────────── */}
      <div className="relative w-full aspect-square overflow-hidden bg-black">
        {/* Flash de obturador */}
        <div
          className={cn(
            "absolute inset-0 bg-white z-20 transition-opacity duration-150 pointer-events-none",
            isFlashing ? "opacity-70" : "opacity-0"
          )}
        />

        {/* Vídeo ao vivo */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Erro de câmera */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background p-6 text-center z-10">
            <div className="space-y-3">
              <CameraIcon size={32} className="text-parchment-muted mx-auto" />
              <p className="text-parchment-muted text-sm leading-relaxed">
                {cameraError}
              </p>
            </div>
          </div>
        )}

        {/* Preview da polaroid após captura */}
        {mode === "preview" && capturedRaw && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-10">
            {isSaving ? (
              <Loader2 size={32} className="text-gold animate-spin" />
            ) : (
              <PolaroidFrame
                imageSrc={capturedRaw}
                guestName={guest.name}
                capturedAt={capturedAt}
                onCanvasReady={handlePolaroidReady}
                pixelWidth={360}
                className="drop-shadow-2xl max-w-[85%]"
              />
            )}
          </div>
        )}
      </div>

      {/* ── Controles ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between px-6 py-5 gap-4">
        <div className="flex items-center justify-between">
          {/* Botão de troca de câmera */}
          <button
            onClick={handleFlipCamera}
            disabled={mode !== "viewfinder" || isSaving || !!cameraError}
            aria-label="Trocar câmera"
            className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <SwitchCamera size={18} />
          </button>

          {/* Botão circular de captura */}
          <button
            onClick={handleCapture}
            disabled={actualRemaining <= 0 || mode !== "viewfinder" || isSaving || !!cameraError}
            aria-label="Tirar foto"
            className={cn(
              "w-[68px] h-[68px] rounded-full flex items-center justify-center",
              "bg-gold hover:bg-gold-bright transition-all",
              "active:scale-95 shadow-lg shadow-gold/20",
              "disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
            )}
          >
            <div className="w-[54px] h-[54px] rounded-full border-2 border-background/40" />
          </button>

          {/* Atalho para revisão */}
          <button
            onClick={() => navigate("/app/review")}
            className="btn-ghost flex-col items-center gap-0.5"
          >
            <Images size={18} />
            {pendingCount > 0 && (
              <span className="text-[9px] text-gold font-bold">{pendingCount}</span>
            )}
          </button>
        </div>

        {/* Indicador de fotos restantes */}
        <p className="text-center text-xs tracking-wide uppercase">
          {actualRemaining > 0 ? (
            <span className="text-parchment-muted">
              Restam {actualRemaining} foto{actualRemaining !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-gold">Limite de fotos atingido</span>
          )}
        </p>
      </div>
    </div>
  );
}
