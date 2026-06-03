import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronLeft,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { formatPhoneBR, onlyDigits } from "@/lib/phone";
import { addGuest } from "@/lib/supabasePhotos";
import {
  getEventStats,
  getPhotoCountsByGuest,
  listAllEvents,
  listEventGuestsFull,
  updateEvent,
  updateGuest,
  deleteGuest,
  generateSlug,
  type EventRow,
  type GuestRow,
  type EventStats,
} from "@/lib/supabaseAdmin";

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="luxe-card p-4 text-center flex-1">
      <p className="text-2xl font-serif text-gold">{value}</p>
      <p className="text-[10px] tracking-wide uppercase text-parchment-muted mt-0.5">{label}</p>
    </div>
  );
}

// ── Formulário de edição do evento ────────────────────────────────────────────

interface EditEventFormProps {
  event: EventRow;
  onSaved: (updated: Partial<EventRow>) => void;
  onCancel: () => void;
}

function EditEventForm({ event, onSaved, onCancel }: EditEventFormProps) {
  const [name, setName]               = useState(event.name);
  const [slug, setSlug]               = useState(event.slug);
  const [date, setDate]               = useState(event.event_date ?? "");
  const [guestLimit, setGuestLimit]   = useState(String(event.default_guest_photo_limit));
  const [sponsorLimit, setSponsorLimit] = useState(String(event.default_sponsor_photo_limit));
  const [isSaving, setIsSaving]       = useState(false);
  const [slugEdited, setSlugEdited]   = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(generateSlug(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const gl = parseInt(guestLimit, 10);
    const sl = parseInt(sponsorLimit, 10);
    if (!name.trim() || !slug.trim() || isNaN(gl) || isNaN(sl) || gl < 1 || sl < 1) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        name:                        name.trim(),
        slug:                        slug.trim(),
        event_date:                  date || null,
        default_guest_photo_limit:   gl,
        default_sponsor_photo_limit: sl,
      };
      await updateEvent(event.id, updates);
      toast.success("Evento atualizado.");
      onSaved(updates);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="luxe-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-luxury uppercase text-gold">Editar Evento</p>
        <button type="button" onClick={onCancel} className="btn-ghost">
          <X size={13} /> Cancelar
        </button>
      </div>

      <div>
        <label className="luxe-label">Nome</label>
        <input
          className="luxe-input"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={isSaving}
        />
      </div>

      <div>
        <label className="luxe-label">Slug</label>
        <input
          className="luxe-input font-mono text-sm"
          value={slug}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          }}
          disabled={isSaving}
        />
        <p className="text-[10px] text-parchment-muted mt-1">
          QR Code: <span className="text-gold">/?evento={slug || "…"}</span>
        </p>
      </div>

      <div>
        <label className="luxe-label">Data</label>
        <input
          type="date"
          className="luxe-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isSaving}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="luxe-label">Limite Convidado</label>
          <input
            type="number"
            min={1}
            className="luxe-input text-center"
            value={guestLimit}
            onChange={(e) => setGuestLimit(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className="flex-1">
          <label className="luxe-label">Limite Patrocinador</label>
          <input
            type="number"
            min={1}
            className="luxe-input text-center"
            value={sponsorLimit}
            onChange={(e) => setSponsorLimit(e.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <button type="submit" className="btn-gold" disabled={isSaving}>
        {isSaving ? (
          <><Loader2 size={15} className="animate-spin" /> Salvando…</>
        ) : (
          <><Save size={15} /> Salvar Alterações</>
        )}
      </button>
    </form>
  );
}

// ── Linha de convidado com edição completa + delete ───────────────────────────

interface GuestRowItemProps {
  guest: GuestRow;
  photoCount: number;
  onUpdated: (guestId: string, updates: Partial<GuestRow>) => void;
  onDeleted: (guestId: string) => void;
}

function GuestRowItem({ guest, photoCount, onUpdated, onDeleted }: GuestRowItemProps) {
  const [editing, setEditing]     = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editName, setEditName]   = useState(guest.name);
  const [editPhone, setEditPhone] = useState(guest.phone_digits);
  const [editType, setEditType]   = useState(guest.guest_type as string);
  const [editLimit, setEditLimit] = useState(String(guest.photo_limit));

  function openEdit() {
    setEditName(guest.name);
    setEditPhone(guest.phone_digits);
    setEditType(guest.guest_type as string);
    setEditLimit(String(guest.photo_limit));
    setEditing(true);
  }

  async function handleSave() {
    const newLimit = parseInt(editLimit, 10);
    if (!editName.trim() || isNaN(newLimit) || newLimit < 1) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    const digits = onlyDigits(editPhone);
    if (digits.length < 10) { toast.error("Telefone inválido."); return; }
    setIsSaving(true);
    try {
      const updates = { name: editName.trim(), phone_digits: digits, guest_type: editType, photo_limit: newLimit };
      await updateGuest(guest.id, updates);
      onUpdated(guest.id, updates as Partial<GuestRow>);
      toast.success("Convidado atualizado.");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteGuest(guest.id);
      onDeleted(guest.id);
      toast.success(`${guest.name} removido.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (editing) {
    return (
      <div className="py-3 border-b border-gold-muted space-y-2">
        <input className="luxe-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" disabled={isSaving} />
        <input className="luxe-input" value={formatPhoneBR(editPhone)} onChange={(e) => setEditPhone(onlyDigits(e.target.value))} placeholder="Telefone" inputMode="numeric" disabled={isSaving} />
        <div className="flex gap-2">
          <select className="luxe-input flex-1" value={editType} onChange={(e) => setEditType(e.target.value)} disabled={isSaving}>
            <option value="guest">Convidado</option>
            <option value="sponsor">Patrocinador</option>
          </select>
          <input type="number" min={1} max={500} className="luxe-input w-20 text-center" value={editLimit} onChange={(e) => setEditLimit(e.target.value)} placeholder="Fotos" disabled={isSaving} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="btn-ghost flex-1" disabled={isSaving}><X size={12} /> Cancelar</button>
          <button onClick={handleSave} className="btn-gold flex-1" disabled={isSaving}>
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar
          </button>
        </div>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="py-3 border-b border-gold-muted space-y-2">
        <p className="text-parchment text-sm text-center">Remover <span className="text-gold">{guest.name}</span>?</p>
        <div className="flex gap-2">
          <button onClick={() => setConfirmDelete(false)} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={handleDelete} className="btn-gold flex-1" disabled={isDeleting}>
            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Remover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-gold-muted">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-parchment text-sm truncate">{guest.name}</p>
          <p className="text-parchment-muted text-[10px] mt-0.5">
            {formatPhoneBR(guest.phone_digits)} ·{" "}
            <span className={guest.guest_type === "sponsor" ? "text-gold" : "text-parchment-muted"}>
              {guest.guest_type === "sponsor" ? "patrocinador" : "convidado"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <span className="text-[10px] text-parchment-muted">{photoCount}/{guest.photo_limit} fotos</span>
          <button onClick={openEdit} className="btn-ghost" aria-label="Editar"><Pencil size={11} /></button>
          <button onClick={() => setConfirmDelete(true)} className="btn-ghost text-destructive-foreground" aria-label="Remover"><Trash2 size={11} /></button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AdminEventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate    = useNavigate();

  const [event, setEvent]       = useState<EventRow | null>(null);
  const [stats, setStats]       = useState<EventStats | null>(null);
  const [guests, setGuests]     = useState<GuestRow[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading]     = useState(true);
  const [showEditForm, setShowEditForm]   = useState(false);
  const [showAddGuest, setShowAddGuest]   = useState(false);
  const [newName, setNewName]             = useState("");
  const [newPhone, setNewPhone]           = useState("");
  const [newType, setNewType]             = useState<"guest" | "sponsor">("guest");
  const [newLimit, setNewLimit]           = useState("20");
  const [isSavingGuest, setIsSavingGuest] = useState(false);
  const [search, setSearch]               = useState("");

  useEffect(() => {
    if (!eventId) return;

    Promise.all([
      listAllEvents().then((events) => events.find((e) => e.id === eventId) ?? null),
      getEventStats(eventId),
      listEventGuestsFull(eventId),
      getPhotoCountsByGuest(eventId),
    ])
      .then(([ev, st, gs, counts]) => {
        if (!ev) { toast.error("Evento não encontrado."); navigate("/admin"); return; }
        setEvent(ev);
        setStats(st);
        setGuests(gs);
        setPhotoCounts(counts);
      })
      .catch(() => toast.error("Erro ao carregar dados do evento."))
      .finally(() => setIsLoading(false));
  }, [eventId, navigate]);

  const filteredGuests = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return guests;
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.phone_digits.includes(q)
    );
  }, [guests, search]);

  // Observabilidade: convidados bloqueados ou próximos do limite
  const atLimitGuests = useMemo(
    () => guests.filter((g) => (photoCounts[g.id] ?? 0) >= g.photo_limit),
    [guests, photoCounts]
  );
  const nearLimitGuests = useMemo(
    () =>
      guests.filter((g) => {
        const count = photoCounts[g.id] ?? 0;
        const ratio = g.photo_limit > 0 ? count / g.photo_limit : 0;
        return ratio >= 0.8 && ratio < 1;
      }),
    [guests, photoCounts]
  );

  function handleEventSaved(updates: Partial<EventRow>) {
    setEvent((prev) => prev ? { ...prev, ...updates } : prev);
    setShowEditForm(false);
  }

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || isSavingGuest) return;
    const digits = onlyDigits(newPhone);
    if (digits.length < 10) { toast.error("Telefone inválido."); return; }
    const limit = parseInt(newLimit, 10);
    if (!newName.trim() || isNaN(limit) || limit < 1) { toast.error("Preencha todos os campos."); return; }
    setIsSavingGuest(true);
    try {
      await addGuest({ eventId, name: newName.trim(), phoneDigits: digits, guestType: newType, photoLimit: limit });
      const newRow: GuestRow = {
        id: crypto.randomUUID(), event_id: eventId, name: newName.trim(),
        phone_digits: digits, guest_type: newType as never, photo_limit: limit,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setGuests((prev) => [...prev, newRow].sort((a, b) => a.name.localeCompare(b.name)));
      setStats((prev) => prev ? { ...prev, totalGuests: prev.totalGuests + 1 } : prev);
      setNewName(""); setNewPhone(""); setNewType("guest"); setNewLimit("20");
      setShowAddGuest(false);
      toast.success("Convidado adicionado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setIsSavingGuest(false);
    }
  }

  function handleGuestUpdated(guestId: string, updates: Partial<GuestRow>) {
    setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, ...updates } : g)));
  }

  function handleGuestDeleted(guestId: string) {
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
    setStats((prev) => prev ? { ...prev, totalGuests: prev.totalGuests - 1 } : prev);
  }

  if (isLoading) {
    return (
      <div className="luxe-frame items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gold" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="luxe-frame">
      {/* Header */}
      <div className="luxe-frame-inner pb-0">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => navigate("/admin")} className="btn-ghost">
            <ChevronLeft size={14} /> Admin
          </button>
        </div>
        <BrandHeader subtitle="GERENCIAR EVENTO" />

        {/* Slug */}
        <p className="text-center text-[10px] font-mono text-parchment-muted -mt-4 mb-6">
          /{event.slug}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="luxe-frame-inner py-4 space-y-6">

          {/* Stats */}
          {stats && (
            <div className="flex gap-3">
              <StatCard value={stats.totalGuests}    label="Convidados" />
              <StatCard value={stats.totalPhotos}    label="Fotos" />
              <StatCard value={stats.selectedPhotos} label="Selecionadas" />
            </div>
          )}

          {/* ── Observabilidade: alertas de limite ──────────────────────────── */}
          {(atLimitGuests.length > 0 || nearLimitGuests.length > 0) && (
            <div className="space-y-2">
              {atLimitGuests.length > 0 && (
                <div className="rounded border border-destructive/50 bg-destructive/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={13} className="text-destructive-foreground flex-none" />
                    <p className="text-[10px] tracking-wide uppercase text-destructive-foreground font-medium">
                      {atLimitGuests.length} convidado{atLimitGuests.length !== 1 ? "s" : ""} bloqueado{atLimitGuests.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="text-[10px] text-destructive-foreground/80 mb-2">
                    Atingiram o limite e não conseguem enviar mais fotos. Aumente o limite individualmente na lista abaixo.
                  </p>
                  <div className="space-y-0.5">
                    {atLimitGuests.map((g) => (
                      <p key={g.id} className="text-[11px] text-destructive-foreground/90">
                        · {g.name} — {photoCounts[g.id] ?? 0}/{g.photo_limit} fotos
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {nearLimitGuests.length > 0 && (
                <div className="rounded border border-gold-muted bg-gold-subtle p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={13} className="text-gold flex-none" />
                    <p className="text-[10px] tracking-wide uppercase text-gold font-medium">
                      {nearLimitGuests.length} convidado{nearLimitGuests.length !== 1 ? "s" : ""} quase no limite
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {nearLimitGuests.map((g) => {
                      const count = photoCounts[g.id] ?? 0;
                      const pct   = Math.round((count / g.photo_limit) * 100);
                      return (
                        <p key={g.id} className="text-[11px] text-parchment-muted">
                          · {g.name} — {count}/{g.photo_limit} fotos ({pct}%)
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Informações do evento */}
          {!showEditForm && (
            <div className="luxe-card p-5 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] tracking-luxury uppercase text-gold">
                  Informações
                </p>
                <button
                  onClick={() => setShowEditForm(true)}
                  className="btn-ghost"
                >
                  <Pencil size={12} /> Editar
                </button>
              </div>
              <InfoRow label="Nome"       value={event.name} />
              <InfoRow label="Data"       value={
                event.event_date
                  ? new Date(event.event_date + "T12:00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "long", year: "numeric",
                    })
                  : "—"
              } />
              <InfoRow label="Lim. Convidado"    value={`${event.default_guest_photo_limit} fotos`} />
              <InfoRow label="Lim. Patrocinador" value={`${event.default_sponsor_photo_limit} fotos`} />
            </div>
          )}

          {showEditForm && (
            <EditEventForm
              event={event}
              onSaved={handleEventSaved}
              onCancel={() => setShowEditForm(false)}
            />
          )}

          {/* Convidados */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] tracking-luxury uppercase text-gold">
                Convidados ({guests.length})
              </p>
              <button onClick={() => setShowAddGuest((v) => !v)} className="btn-ghost">
                {showAddGuest ? <><X size={12} /> Cancelar</> : <><UserPlus size={12} /> Adicionar</>}
              </button>
            </div>

            {showAddGuest && (
              <form onSubmit={handleAddGuest} className="luxe-card p-4 space-y-3 mb-4">
                <input className="luxe-input" placeholder="Nome completo" value={newName}
                  onChange={(e) => setNewName(e.target.value)} disabled={isSavingGuest} />
                <input className="luxe-input" placeholder="(11) 99999-9999" value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)} inputMode="numeric" disabled={isSavingGuest} />
                <div className="flex gap-3">
                  <select className="luxe-input flex-1" value={newType}
                    onChange={(e) => setNewType(e.target.value as "guest" | "sponsor")} disabled={isSavingGuest}>
                    <option value="guest">Convidado</option>
                    <option value="sponsor">Patrocinador</option>
                  </select>
                  <input className="luxe-input w-20 text-center" type="number" min={1} max={500}
                    value={newLimit} onChange={(e) => setNewLimit(e.target.value)}
                    placeholder="Limite" disabled={isSavingGuest} />
                </div>
                <button type="submit" className="btn-gold w-full" disabled={isSavingGuest}>
                  {isSavingGuest ? <><Loader2 size={14} className="animate-spin" /> Salvando…</> : <><Plus size={14} /> Adicionar</>}
                </button>
              </form>
            )}


            {/* Busca */}
            {guests.length > 6 && (
              <div className="relative mb-3">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment-muted pointer-events-none"
                />
                <input
                  className="luxe-input pl-8 py-2 text-sm"
                  placeholder="Buscar por nome ou telefone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}

            {filteredGuests.length === 0 && (
              <p className="text-parchment-muted text-sm text-center py-6">
                {search ? "Nenhum convidado encontrado." : "Nenhum convidado cadastrado."}
              </p>
            )}

            {filteredGuests.map((g) => (
              <GuestRowItem
                key={g.id}
                guest={g}
                photoCount={photoCounts[g.id] ?? 0}
                onUpdated={handleGuestUpdated}
                onDeleted={handleGuestDeleted}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[10px] uppercase tracking-wide text-parchment-muted flex-none">
        {label}
      </span>
      <span className="text-parchment text-sm text-right truncate">{value}</span>
    </div>
  );
}
