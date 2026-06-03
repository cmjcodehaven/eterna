import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  Trash2,
  Camera as CameraIcon,
  Send,
  Loader2,
  RefreshCw,
  X,
  CheckCircle2,
  Circle,
} from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { useGuest } from "@/contexts/GuestContext";
import { supabase } from "@/integrations/supabase/client";
import {
  listPendingPhotos,
  deletePendingPhoto,
  clearPendingPhotos,
} from "@/lib/photoStorage";
import { dataUrlToBlob } from "@/lib/image";
import type { PendingPhoto, SubmitPhotosResponse } from "@/types/domain";

// ── Helpers de retry ──────────────────────────────────────────────────────────

const MAX_RETRIES    = 3;
const RETRY_DELAYS   = [1500, 3000, 6000]; // ms, backoff exponencial

/** Erros de negócio que NÃO devem acionar retry. */
function isBusinessError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("limite") ||
    lower.includes("autorizado") ||
    lower.includes("inválido") ||
    lower.includes("obrigatório") ||
    lower.includes("ausentes")
  );
}

/** Detecta erros de servidor/gateway que merecem retry. */
function isServerError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const status = (error as { status?: number }).status;
    if (status === 503 || status === 502 || status === 504) return true;
  }
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    return lower.includes("503") || lower.includes("502") || lower.includes("504") || lower.includes("service unavailable");
  }
  return false;
}

/** Extrai mensagem legível de um erro da Edge Function. */
function extractEFMessage(error: unknown): string {
  if (error && typeof error === "object" && "context" in error) {
    const ctx = (error as { context: unknown }).context;
    if (ctx && typeof ctx === "object" && "error" in ctx) {
      return String((ctx as { error: string }).error);
    }
  }
  if (error instanceof Error) return error.message;
  return "Erro ao enviar fotos. Verifique a conexão e tente novamente.";
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function Review() {
  const { guest, incrementUploadedCount } = useGuest();
  const navigate = useNavigate();

  const [photos, setPhotos]               = useState<PendingPhoto[]>([]);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading]         = useState(true);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryAttempt, setRetryAttempt]   = useState(0);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc]     = useState<string | null>(null);

  // ── Carrega fotos pendentes do IndexedDB ───────────────────────────────────
  useEffect(() => {
    if (!guest) return;
    listPendingPhotos(guest.eventId, guest.id)
      .then((list) => {
        setPhotos(list);
        setSelectedIds(new Set(list.map((p) => p.localId)));
      })
      .catch(() => toast.error("Erro ao carregar fotos salvas."))
      .finally(() => setIsLoading(false));
  }, [guest]);

  if (!guest) return null;

  // ── Seleção de fotos ──────────────────────────────────────────────────────
  function toggleSelect(localId: string) {
    if (isSubmitting) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) next.delete(localId); else next.add(localId);
      return next;
    });
  }

  function selectAll()   { setSelectedIds(new Set(photos.map((p) => p.localId))); }
  function deselectAll() { setSelectedIds(new Set()); }

  // ── Exclusão individual (com confirmação) ─────────────────────────────────
  function handleDeleteRequest(localId: string) {
    if (deleting || isSubmitting) return;
    setPendingDelete(localId);
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    const id = pendingDelete;
    setPendingDelete(null);
    setDeleting(id);
    try {
      await deletePendingPhoto(guest!.eventId, guest!.id, id);
      setPhotos((prev) => prev.filter((p) => p.localId !== id));
    } catch {
      toast.error("Não foi possível apagar a foto.");
    } finally {
      setDeleting(null);
    }
  }

  // ── Envio com retry automático em falhas de rede ───────────────────────────
  async function handleSubmit() {
    const toSubmit = photos.filter((p) => selectedIds.has(p.localId));
    if (isSubmitting || toSubmit.length === 0 || !guest) return;
    setIsSubmitting(true);
    setUploadProgress(0);
    setRetryAttempt(0);

    try {
      // Fase 1 — converte só as selecionadas (0 → 35%)
      const formBlobs: Array<{ blob: Blob; name: string }> = [];
      for (let i = 0; i < toSubmit.length; i++) {
        formBlobs.push({
          blob: dataUrlToBlob(toSubmit[i].dataUrl),
          name: `photo-${i}.jpg`,
        });
        setUploadProgress(Math.round(((i + 1) / toSubmit.length) * 35));
      }

      // Fase 2 — loop de tentativas
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        let networkTimer: ReturnType<typeof setInterval> | null = null;
        let shouldRetry = false;

        try {
          // Anima barra de rede de 35 → 88%
          setUploadProgress(35);
          networkTimer = setInterval(() => {
            setUploadProgress((p) => (p < 88 ? p + 1 : p));
          }, 200);

          // Reconstrói o FormData em cada tentativa (body consumed on send)
          const formData = new FormData();
          formData.append("eventId", guest!.eventId);
          formData.append("guestId", guest!.id);
          formData.append("phone",   guest!.phoneDigits);
          formBlobs.forEach(({ blob, name }) => formData.append("files", blob, name));
          formData.append("localIds", JSON.stringify(toSubmit.map((p) => p.localId)));

          const { data, error } =
            await supabase.functions.invoke<SubmitPhotosResponse>("submit-photos", {
              body: formData,
            });

          if (error) {
            const msg = extractEFMessage(error);
            if (isBusinessError(msg)) throw new Error(msg); // não retenta
            lastError = new Error(isServerError(error) ? "Servidor temporariamente indisponível. Aguardando…" : msg);
            shouldRetry = true;
          } else if (!data?.ok) {
            lastError = new Error("Envio não confirmado pelo servidor. Tente novamente.");
            shouldRetry = true;
          } else {
            // ── Sucesso ─────────────────────────────────────────────────────
            setUploadProgress(100);
            await clearPendingPhotos(guest!.eventId, guest!.id);
            incrementUploadedCount(data.uploaded);
            toast.success(
              `${data.uploaded} foto${data.uploaded !== 1 ? "s" : ""} enviada${data.uploaded !== 1 ? "s" : ""} com sucesso!`
            );
            navigate("/app", { replace: true });
            return;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (isBusinessError(msg)) throw err; // propaga sem retry
          lastError = err instanceof Error ? err : new Error("Erro de rede.");
          shouldRetry = true;
        } finally {
          if (networkTimer) clearInterval(networkTimer);
        }

        // Aguarda antes de tentar novamente
        if (shouldRetry && attempt < MAX_RETRIES) {
          setRetryAttempt(attempt);
          setUploadProgress(0);
          await new Promise<void>((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));
        }
      }

      // Todas as tentativas falharam
      throw lastError ?? new Error("Erro ao enviar fotos. Verifique a conexão e tente novamente.");

    } catch (err) {
      setUploadProgress(0);
      setRetryAttempt(0);
      // Fotos permanecem no localforage — nunca apagar em caso de falha
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao enviar fotos. Verifique a conexão e tente novamente.",
        { duration: 6000 }
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Rótulo do botão de envio ───────────────────────────────────────────────
  function submitLabel() {
    if (!isSubmitting) {
      return (
        <>
          <Send size={15} />
          Enviar selecionadas ({selectedIds.size})
        </>
      );
    }
    if (retryAttempt > 0) {
      return (
        <>
          <RefreshCw size={15} className="animate-spin" />
          Tentativa {retryAttempt + 1}/{MAX_RETRIES}… {uploadProgress}%
        </>
      );
    }
    return (
      <>
        <Loader2 size={15} className="animate-spin" />
        Enviando… {uploadProgress}%
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="luxe-frame">
      {/* Header */}
      <div className="luxe-frame-inner pb-0">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => navigate(-1)} className="btn-ghost">
            <ChevronLeft size={14} />
            Voltar
          </button>
          <span className="photo-counter">
            {guest.uploadedCount}/{guest.photoLimit} enviadas
          </span>
        </div>
        <BrandHeader subtitle="SUAS FOTOS" />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gold" />
        </div>
      )}

      {/* Estado vazio */}
      {!isLoading && photos.length === 0 && (
        <div className="luxe-frame-inner flex-1 flex flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-parchment-muted text-sm leading-relaxed">
            Nenhuma foto pendente de envio.
            <br />
            Abra a câmera para registrar momentos.
          </p>
          <button
            className="btn-gold-outline"
            onClick={() => navigate("/app/camera")}
          >
            <CameraIcon size={16} />
            Abrir câmera
          </button>
        </div>
      )}

      {/* Grid de fotos pendentes */}
      {!isLoading && photos.length > 0 && (
        <>
          <div className="px-4 pb-2">
                <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] tracking-wide uppercase text-parchment-muted">
                {selectedIds.size}/{photos.length} selecionada{selectedIds.size !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-3">
                <button onClick={selectAll} className="text-[10px] text-gold underline">Todas</button>
                <button onClick={deselectAll} className="text-[10px] text-parchment-muted underline">Nenhuma</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => {
                const selected = selectedIds.has(photo.localId);
                return (
                  <div
                    key={photo.localId}
                    className="relative rounded overflow-hidden shadow-md cursor-pointer"
                    onClick={() => toggleSelect(photo.localId)}
                  >
                    <img
                      src={photo.dataUrl}
                      alt="Foto pendente"
                      className={`w-full block transition-opacity ${selected ? "opacity-100" : "opacity-40"}`}
                      loading="lazy"
                    />
                    {/* Overlay de seleção */}
                    <div className="absolute top-2 left-2">
                      {selected
                        ? <CheckCircle2 size={22} className="text-gold drop-shadow" />
                        : <Circle size={22} className="text-white/60 drop-shadow" />
                      }
                    </div>
                    {/* Botão deletar */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRequest(photo.localId); }}
                      disabled={!!deleting || isSubmitting}
                      aria-label="Apagar foto"
                      className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 active:scale-90 transition-transform"
                    >
                      {deleting === photo.localId
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />
                      }
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aviso offline + ações */}
          <div className="luxe-frame-inner pt-2 space-y-3">
            {retryAttempt > 0 && isSubmitting && (
              <p className="text-[10px] text-gold text-center tracking-wide">
                Conexão instável — tentando novamente automaticamente…
              </p>
            )}

            <p className="text-parchment-muted text-xs text-center leading-relaxed">
              Suas fotos ficam salvas neste dispositivo.
              <br />
              Mesmo sem internet, nada se perde.
              <br />
              O envio só acontece ao confirmar.
            </p>

            <button
              className="btn-gold"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedIds.size === 0}
            >
              {submitLabel()}
            </button>

            {/* Barra de progresso de upload */}
            {isSubmitting && (
              <div className="h-1 bg-gold-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <button
              className="btn-gold-outline"
              onClick={() => navigate("/app/camera")}
              disabled={isSubmitting}
            >
              <CameraIcon size={15} />
              Tirar mais fotos
            </button>
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="Fechar"
            onClick={() => setLightboxSrc(null)}
          >
            <X size={24} />
          </button>
          <img
            src={lightboxSrc}
            alt="Foto ampliada"
            className="max-w-full max-h-full object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Diálogo de confirmação de exclusão */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center p-4">
          <div className="luxe-card w-full max-w-sm p-5 space-y-4">
            <p className="text-parchment text-sm text-center">
              Apagar esta foto? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                className="btn-gold-outline flex-1"
                onClick={() => setPendingDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-gold flex-1"
                onClick={confirmDelete}
              >
                <Trash2 size={14} />
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
