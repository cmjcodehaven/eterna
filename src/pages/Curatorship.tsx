import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronLeft,
  Heart,
  Loader2,
  SkipForward,
  Star,
} from "lucide-react";
import {
  fetchEventId,
  listEventPhotos,
  signPhotos,
  togglePhotoSelection,
} from "@/lib/supabasePhotos";
import type { PhotoItem } from "@/types/domain";

export default function Curatorship() {
  const navigate = useNavigate();

  const [photos, setPhotos]           = useState<PhotoItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [signedUrls, setSignedUrls]   = useState<Record<string, string>>({});
  const [isLoading, setIsLoading]     = useState(true);
  const [isToggling, setIsToggling]   = useState(false);

  // CSS entrance animation class — toggled on each photo change
  const [animKey, setAnimKey]         = useState(0);

  const prefetchedRef = useRef<Set<string>>(new Set());

  // ── Load all photos on mount ────────────────────────────────────────────────
  useEffect(() => {
    const slug = import.meta.env.VITE_DEFAULT_EVENT_SLUG as string;
    fetchEventId(slug)
      .then((id) => listEventPhotos(id))
      .then(async (photoList) => {
        setPhotos(photoList);

        // Eagerly sign the first two photos
        const firstTwo = photoList.slice(0, 2).map((p) => p.storagePath);
        if (firstTwo.length > 0) {
          const urls = await signPhotos(firstTwo);
          setSignedUrls(urls);
          firstTwo.forEach((p) => prefetchedRef.current.add(p));
        }
      })
      .catch(() => toast.error("Erro ao carregar fotos."))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Prefetch next URL when index changes ────────────────────────────────────
  useEffect(() => {
    const next = photos[currentIndex + 1];
    if (!next || prefetchedRef.current.has(next.storagePath)) return;
    prefetchedRef.current.add(next.storagePath);
    signPhotos([next.storagePath]).then((urls) =>
      setSignedUrls((prev) => ({ ...prev, ...urls }))
    );
  }, [currentIndex, photos]);

  const current  = photos[currentIndex];
  const finished = !isLoading && (photos.length === 0 || currentIndex >= photos.length);

  // ── Advance to next photo with animation ────────────────────────────────────
  function advanceTo(nextIndex: number) {
    setAnimKey((k) => k + 1);
    setCurrentIndex(nextIndex);
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleChoose() {
    if (!current || isToggling) return;
    setIsToggling(true);
    const next = !current.selected;
    try {
      await togglePhotoSelection(current.id, next);
      setPhotos((prev) =>
        prev.map((p, i) => (i === currentIndex ? { ...p, selected: next } : p))
      );
      toast.success(next ? "✦ Foto selecionada!" : "Seleção removida.");
    } catch {
      toast.error("Erro ao atualizar seleção.");
    } finally {
      setIsToggling(false);
    }
  }

  function handleSkip() {
    advanceTo(currentIndex + 1);
  }

  function handleBack() {
    if (currentIndex === 0) return;
    advanceTo(currentIndex - 1);
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="luxe-frame items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gold" />
      </div>
    );
  }

  // ── Finished state ───────────────────────────────────────────────────────────
  if (finished) {
    const selectedCount = photos.filter((p) => p.selected).length;
    return (
      <div className="luxe-frame">
        <div className="luxe-frame-inner flex-1 flex flex-col items-center justify-center gap-6 text-center">
          <Heart size={52} className="text-gold" strokeWidth={1.5} />
          <h2 className="brand-title">Curadoria concluída</h2>
          <p className="text-parchment-muted text-sm leading-relaxed">
            Você revisou todas as {photos.length} foto{photos.length !== 1 ? "s" : ""}.
            <br />
            <span className="text-gold font-medium">{selectedCount}</span> selecionada{selectedCount !== 1 ? "s" : ""} para download.
          </p>
          <button className="btn-gold" onClick={() => navigate("/couple")}>
            Voltar ao painel
          </button>
        </div>
      </div>
    );
  }

  const currentUrl = current ? signedUrls[current.storagePath] : undefined;
  const progress   = ((currentIndex + 1) / photos.length) * 100;

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="luxe-frame">
      {/* Header */}
      <div className="luxe-frame-inner pb-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate("/couple")} className="btn-ghost">
            <ChevronLeft size={14} />
            Painel
          </button>
          <span className="text-[11px] text-parchment-muted tracking-wide">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-gold-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Photo area */}
      <div className="flex-1 flex flex-col px-4 pb-4 min-h-0 gap-3">
        {/* Image */}
        <div className="flex-1 rounded-lg overflow-hidden bg-card min-h-0">
          {currentUrl ? (
            <img
              key={animKey}
              src={currentUrl}
              alt={`Foto de ${current?.guestName}`}
              className="w-full h-full object-contain animate-photo-enter"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-gold" />
            </div>
          )}
        </div>

        {/* Guest name + selection badge */}
        <div className="text-center">
          <p className="text-parchment text-sm font-medium">{current?.guestName}</p>
          {current?.selected && (
            <p className="text-gold text-[10px] tracking-wide mt-0.5">✦ Selecionada</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Voltar */}
          <button
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="btn-ghost flex-none"
            aria-label="Voltar"
          >
            <ArrowLeft size={15} />
            Voltar
          </button>

          {/* Escolher / Remover */}
          <button
            onClick={handleChoose}
            disabled={isToggling}
            className={`flex-1 py-3 rounded text-sm tracking-wide uppercase font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              current?.selected
                ? "bg-gold text-background"
                : "border border-gold text-gold"
            }`}
          >
            {isToggling ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Star size={14} fill={current?.selected ? "currentColor" : "none"} />
            )}
            {current?.selected ? "Selecionada" : "Escolher"}
          </button>

          {/* Pular */}
          <button
            onClick={handleSkip}
            className="btn-ghost flex-none"
            aria-label="Pular"
          >
            <SkipForward size={15} />
            Pular
          </button>
        </div>
      </div>
    </div>
  );
}
