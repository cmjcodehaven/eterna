import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  LogOut,
  Sparkles,
  Star,
  Users,
  UserPlus,
  ImageOff,
} from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { useStaff } from "@/contexts/StaffContext";
import {
  fetchEventId,
  listEventPhotos,
  signPhotos,
  togglePhotoSelection,
  listEventGuests,
  addGuest,
} from "@/lib/supabasePhotos";
import { downloadZip } from "@/lib/downloadZip";
import { formatPhoneBR, onlyDigits } from "@/lib/phone";
import type { PhotoItem } from "@/types/domain";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "gallery" | "curatorship" | "guests";

const PHOTOS_PER_PAGE = 12;

interface GuestGroup {
  guestId:          string;
  guestName:        string;
  guestPhoneDigits: string;
  photos:           PhotoItem[];
  signedUrls:       Record<string, string>;
  expanded:         boolean;
  loadingUrls:      boolean;
  visibleCount:     number;
}

interface GuestRow {
  id:          string;
  name:        string;
  phone_digits: string;
  guest_type:  string;
  photo_limit: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CoupleDashboard() {
  const { signOut } = useStaff();
  const navigate     = useNavigate();

  const [tab, setTab]           = useState<Tab>("gallery");
  const [eventId, setEventId]   = useState<string | null>(null);
  const [photos, setPhotos]     = useState<PhotoItem[]>([]);
  const [groups, setGroups]     = useState<GuestGroup[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  // Guests tab
  const [guests, setGuests]           = useState<GuestRow[]>([]);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);
  const [newName, setNewName]         = useState("");
  const [newPhone, setNewPhone]       = useState("");
  const [newType, setNewType]         = useState<"guest" | "sponsor">("guest");
  const [newLimit, setNewLimit]       = useState("20");
  const [isSavingGuest, setIsSavingGuest] = useState(false);

  // ── Load event + photos on mount ────────────────────────────────────────────
  useEffect(() => {
    const slug = import.meta.env.VITE_DEFAULT_EVENT_SLUG as string;

    fetchEventId(slug)
      .then((eid) => {
        setEventId(eid);
        return listEventPhotos(eid);
      })
      .then((photoList) => {
        setPhotos(photoList);

        const groupMap = new Map<string, GuestGroup>();
        for (const photo of photoList) {
          if (!groupMap.has(photo.guestId)) {
            groupMap.set(photo.guestId, {
              guestId:          photo.guestId,
              guestName:        photo.guestName,
              guestPhoneDigits: photo.guestPhoneDigits,
              photos:           [],
              signedUrls:       {},
              expanded:         false,
              loadingUrls:      false,
              visibleCount:     PHOTOS_PER_PAGE,
            });
          }
          groupMap.get(photo.guestId)!.photos.push(photo);
        }
        setGroups(Array.from(groupMap.values()));
      })
      .catch(() => toast.error("Erro ao carregar fotos."))
      .finally(() => setIsLoadingPhotos(false));
  }, []);

  // ── Load guests when tab is active ──────────────────────────────────────────
  useEffect(() => {
    if (tab !== "guests" || !eventId || guests.length > 0) return;
    setIsLoadingGuests(true);
    listEventGuests(eventId)
      .then(setGuests)
      .catch(() => toast.error("Erro ao carregar convidados."))
      .finally(() => setIsLoadingGuests(false));
  }, [tab, eventId, guests.length]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalPhotos   = photos.length;
  const selectedCount = useMemo(() => photos.filter((p) => p.selected).length, [photos]);

  // Photo counts per guest (for guests tab)
  const photoCountByGuest = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of photos) map[p.guestId] = (map[p.guestId] ?? 0) + 1;
    return map;
  }, [photos]);

  // ── Gallery: toggle expand + lazy-sign ──────────────────────────────────────
  async function toggleGroup(guestId: string) {
    const group = groups.find((g) => g.guestId === guestId);
    if (!group) return;

    // Already has URLs or is collapsing — just toggle
    if (group.expanded || Object.keys(group.signedUrls).length > 0) {
      setGroups((prev) =>
        prev.map((g) => (g.guestId === guestId ? { ...g, expanded: !g.expanded } : g))
      );
      return;
    }

    // Expand + load URLs
    setGroups((prev) =>
      prev.map((g) =>
        g.guestId === guestId ? { ...g, expanded: true, loadingUrls: true } : g
      )
    );

    try {
      const paths = group.photos.map((p) => p.storagePath);
      const urls  = await signPhotos(paths);
      setGroups((prev) =>
        prev.map((g) =>
          g.guestId === guestId ? { ...g, signedUrls: urls, loadingUrls: false } : g
        )
      );
    } catch {
      toast.error("Erro ao carregar fotos.");
      setGroups((prev) =>
        prev.map((g) =>
          g.guestId === guestId ? { ...g, expanded: false, loadingUrls: false } : g
        )
      );
    }
  }

  // ── Gallery: load more photos ───────────────────────────────────────────────
  function loadMorePhotos(guestId: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.guestId === guestId
          ? { ...g, visibleCount: g.visibleCount + PHOTOS_PER_PAGE }
          : g
      )
    );
  }

  // ── Gallery: toggle star ─────────────────────────────────────────────────────
  async function handleToggleStar(photoId: string, current: boolean) {
    const next = !current;
    const applyUpdate = (selected: boolean) => {
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, selected } : p)));
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          photos: g.photos.map((p) => (p.id === photoId ? { ...p, selected } : p)),
        }))
      );
    };

    applyUpdate(next);
    try {
      await togglePhotoSelection(photoId, next);
    } catch {
      applyUpdate(current);
      toast.error("Erro ao atualizar seleção.");
    }
  }

  // ── Download ZIP ─────────────────────────────────────────────────────────────
  async function handleDownloadZip() {
    const selected = photos.filter((p) => p.selected);
    if (selected.length === 0) {
      toast.error("Nenhuma foto selecionada para download.");
      return;
    }

    setDownloadProgress(0);
    try {
      const paths    = selected.map((p) => p.storagePath);
      const urlMap   = await signPhotos(paths);

      const items = selected.map((p, i) => ({
        url:       urlMap[p.storagePath],
        guestName: p.guestName,
        filename:  `${String(i + 1).padStart(3, "0")}-${p.storagePath.split("/").pop() ?? "foto.jpg"}`,
      }));

      await downloadZip(items, "eterna-fotos-selecionadas.zip", setDownloadProgress);
      toast.success("Download concluído!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar ZIP.");
    } finally {
      setDownloadProgress(null);
    }
  }

  // ── Add guest ────────────────────────────────────────────────────────────────
  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || isSavingGuest) return;

    const digits = onlyDigits(newPhone);
    if (digits.length < 10 || digits.length > 15) {
      toast.error("Telefone inválido. Use DDD + número.");
      return;
    }
    const limit = parseInt(newLimit, 10);
    if (!newName.trim() || isNaN(limit) || limit < 1) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    setIsSavingGuest(true);
    try {
      await addGuest({
        eventId,
        name:        newName.trim(),
        phoneDigits: digits,
        guestType:   newType,
        photoLimit:  limit,
      });

      const newRow: GuestRow = {
        id:          crypto.randomUUID(),
        name:        newName.trim(),
        phone_digits: digits,
        guest_type:  newType,
        photo_limit: limit,
      };
      setGuests((prev) => [...prev, newRow].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName(""); setNewPhone(""); setNewType("guest"); setNewLimit("20");
      toast.success("Convidado adicionado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar convidado.");
    } finally {
      setIsSavingGuest(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="luxe-frame">
      {/* Header */}
      <div className="luxe-frame-inner pb-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] tracking-wide text-parchment-muted uppercase">
            {totalPhotos} foto{totalPhotos !== 1 ? "s" : ""} · {selectedCount} selecionada{selectedCount !== 1 ? "s" : ""}
          </span>
          <button onClick={signOut} className="btn-ghost text-parchment-muted">
            <LogOut size={13} />
            Sair
          </button>
        </div>
        <BrandHeader subtitle="PAINEL DOS NOIVOS" />

        {/* Tab Bar */}
        <div className="flex border-b border-gold-muted">
          {(
            [
              { key: "gallery",      label: "Galeria",    icon: <ImageOff size={13} /> },
              { key: "curatorship",  label: "Curadoria",  icon: <Sparkles size={13} /> },
              { key: "guests",       label: "Convidados", icon: <Users size={13} /> },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] uppercase tracking-wide transition-colors ${
                tab === t.key
                  ? "border-b-2 border-gold text-gold"
                  : "text-parchment-muted"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: GALERIA ───────────────────────────────────────────────────────── */}
      {tab === "gallery" && (
        <div className="flex-1 overflow-y-auto">
          {isLoadingPhotos && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-gold" />
            </div>
          )}

          {!isLoadingPhotos && groups.length === 0 && (
            <div className="luxe-frame-inner text-center py-16">
              <p className="text-parchment-muted text-sm">
                Nenhuma foto enviada ainda.
              </p>
            </div>
          )}

          {!isLoadingPhotos && groups.map((group) => (
            <div key={group.guestId} className="border-b border-gold-muted">
              {/* Guest card header */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-gold-subtle transition-colors"
                onClick={() => toggleGroup(group.guestId)}
              >
                <div>
                  <p className="text-parchment text-sm font-medium">{group.guestName}</p>
                  <p className="text-parchment-muted text-[10px] mt-0.5">
                    {group.photos.length} foto{group.photos.length !== 1 ? "s" : ""}
                    {group.photos.filter((p) => p.selected).length > 0 && (
                      <span className="ml-2 text-gold">
                        ✦ {group.photos.filter((p) => p.selected).length} selecionada{group.photos.filter((p) => p.selected).length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
                {group.loadingUrls ? (
                  <Loader2 size={15} className="animate-spin text-gold" />
                ) : group.expanded ? (
                  <ChevronUp size={15} className="text-parchment-muted" />
                ) : (
                  <ChevronDown size={15} className="text-parchment-muted" />
                )}
              </button>

              {/* Photo grid */}
              {group.expanded && !group.loadingUrls && (
                <div className="pb-3">
                  <div className="grid grid-cols-3 gap-1 px-1">
                    {group.photos.slice(0, group.visibleCount).map((photo) => {
                      const url = group.signedUrls[photo.storagePath];
                      return (
                        <div key={photo.id} className="relative aspect-square rounded overflow-hidden bg-card">
                          {url ? (
                            <img
                              src={url}
                              alt={`Foto de ${group.guestName}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 size={14} className="animate-spin text-gold" />
                            </div>
                          )}
                          {/* Download individual */}
                          {url && (
                            <a
                              href={url}
                              download={photo.storagePath.split("/").pop() ?? "foto.jpg"}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Baixar foto"
                              className="absolute top-1.5 left-1.5 bg-black/60 text-white/80 rounded-full p-1 hover:text-white transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download size={11} />
                            </a>
                          )}
                          <button
                            onClick={() => handleToggleStar(photo.id, photo.selected)}
                            aria-label={photo.selected ? "Remover seleção" : "Selecionar"}
                            className={`absolute bottom-1.5 right-1.5 rounded-full p-1 transition-colors ${
                              photo.selected
                                ? "bg-gold text-background"
                                : "bg-black/60 text-white/60"
                            }`}
                          >
                            <Star size={12} fill={photo.selected ? "currentColor" : "none"} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {group.visibleCount < group.photos.length && (
                    <button
                      onClick={() => loadMorePhotos(group.guestId)}
                      className="w-full mt-2 py-2 text-[10px] tracking-wide uppercase text-gold border-t border-gold-muted"
                    >
                      Carregar mais ({group.photos.length - group.visibleCount} restantes)
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: CURADORIA ─────────────────────────────────────────────────────── */}
      {tab === "curatorship" && (
        <div className="luxe-frame-inner flex-1 flex flex-col gap-5">
          {/* Stats */}
          <div className="luxe-card p-5 text-center space-y-1">
            <p className="text-4xl font-serif text-gold">{selectedCount}</p>
            <p className="text-[10px] tracking-luxury uppercase text-parchment-muted">
              foto{selectedCount !== 1 ? "s" : ""} selecionada{selectedCount !== 1 ? "s" : ""}
            </p>
            <div className="gold-divider mt-3" />
            <p className="text-xs text-parchment-muted pt-1">
              de {totalPhotos} foto{totalPhotos !== 1 ? "s" : ""} enviada{totalPhotos !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Actions */}
          <button
            className="btn-gold"
            onClick={() => navigate("/couple/curadoria")}
            disabled={totalPhotos === 0}
          >
            <Sparkles size={15} />
            Iniciar Curadoria
          </button>

          <button
            className="btn-gold-outline relative"
            onClick={handleDownloadZip}
            disabled={selectedCount === 0 || downloadProgress !== null}
          >
            {downloadProgress !== null ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Gerando ZIP… {downloadProgress}%
              </>
            ) : (
              <>
                <Download size={15} />
                Baixar Selecionadas ({selectedCount})
              </>
            )}
          </button>

          {downloadProgress !== null && (
            <div className="h-1 bg-gold-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}

          <p className="text-[10px] text-parchment-muted text-center leading-relaxed">
            Na curadoria você revisa foto por foto e escolhe as que deseja guardar.
            <br />
            O ZIP inclui apenas as fotos marcadas com ✦.
          </p>
        </div>
      )}

      {/* ── TAB: CONVIDADOS ────────────────────────────────────────────────────── */}
      {tab === "guests" && (
        <div className="flex-1 overflow-y-auto">
          {/* Add guest form */}
          <form onSubmit={handleAddGuest} className="luxe-frame-inner space-y-3 border-b border-gold-muted">
            <p className="text-[10px] tracking-luxury uppercase text-gold">
              Adicionar Convidado
            </p>

            <input
              className="luxe-input"
              placeholder="Nome completo"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={isSavingGuest}
            />
            <input
              className="luxe-input"
              placeholder="(11) 99999-9999"
              value={newPhone}
              onChange={(e) => setNewPhone(formatPhoneBR(e.target.value))}
              inputMode="numeric"
              disabled={isSavingGuest}
            />
            <div className="flex gap-3">
              <select
                className="luxe-input flex-1"
                value={newType}
                onChange={(e) => setNewType(e.target.value as "guest" | "sponsor")}
                disabled={isSavingGuest}
              >
                <option value="guest">Convidado</option>
                <option value="sponsor">Patrocinador</option>
              </select>
              <input
                className="luxe-input w-20 text-center"
                type="number"
                min={1}
                max={200}
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="Limite"
                disabled={isSavingGuest}
              />
            </div>

            <button type="submit" className="btn-gold-outline w-full" disabled={isSavingGuest}>
              {isSavingGuest ? (
                <><Loader2 size={14} className="animate-spin" /> Salvando…</>
              ) : (
                <><UserPlus size={14} /> Adicionar</>
              )}
            </button>
          </form>

          {/* Guest list */}
          {isLoadingGuests && (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-gold" />
            </div>
          )}

          {!isLoadingGuests && guests.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between px-4 py-3 border-b border-gold-muted"
            >
              <div>
                <p className="text-parchment text-sm">{g.name}</p>
                <p className="text-parchment-muted text-[10px] mt-0.5">
                  {formatPhoneBR(g.phone_digits)} · limite {g.photo_limit} foto{g.photo_limit !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gold text-sm font-medium">
                  {photoCountByGuest[g.id] ?? 0}
                </p>
                <p className="text-parchment-muted text-[10px]">foto{(photoCountByGuest[g.id] ?? 0) !== 1 ? "s" : ""}</p>
              </div>
            </div>
          ))}

          {!isLoadingGuests && guests.length === 0 && (
            <div className="text-center py-10">
              <p className="text-parchment-muted text-sm">Nenhum convidado cadastrado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
