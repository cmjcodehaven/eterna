import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Calendar,
  ChevronRight,
  Image,
  Loader2,
  LogOut,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { useStaff } from "@/contexts/StaffContext";
import {
  createEvent,
  generateSlug,
  getRecentPhotos,
  listAllEvents,
  relativeTime,
  type EventRow,
  type RecentPhotoEntry,
} from "@/lib/supabaseAdmin";

type Tab = "events" | "activity";

// ── Formulário de criação de evento ──────────────────────────────────────────

interface CreateFormProps {
  onCreated: (event: EventRow) => void;
  onCancel: () => void;
}

function CreateEventForm({ onCreated, onCancel }: CreateFormProps) {
  const [name, setName]               = useState("");
  const [slug, setSlug]               = useState("");
  const [date, setDate]               = useState("");
  const [guestLimit, setGuestLimit]   = useState("20");
  const [sponsorLimit, setSponsorLimit] = useState("50");
  const [isSaving, setIsSaving]       = useState(false);
  const [slugEdited, setSlugEdited]   = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(generateSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Nome e slug são obrigatórios.");
      return;
    }
    const gl = parseInt(guestLimit, 10);
    const sl = parseInt(sponsorLimit, 10);
    if (isNaN(gl) || gl < 1 || isNaN(sl) || sl < 1) {
      toast.error("Limites de foto devem ser maiores que zero.");
      return;
    }
    setIsSaving(true);
    try {
      const created = await createEvent({
        name:                    name.trim(),
        slug:                    slug.trim(),
        eventDate:               date || null,
        defaultGuestPhotoLimit:  gl,
        defaultSponsorPhotoLimit: sl,
      });
      toast.success("Evento criado com sucesso!");
      onCreated(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar evento.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="luxe-card p-5 space-y-4 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-luxury uppercase text-gold">Novo Evento</p>
        <button type="button" onClick={onCancel} className="btn-ghost">
          <X size={13} /> Cancelar
        </button>
      </div>

      <div>
        <label className="luxe-label">Nome do Evento</label>
        <input
          className="luxe-input"
          placeholder="Casamento Márcio & Ana"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={isSaving}
        />
      </div>

      <div>
        <label className="luxe-label">Slug (URL)</label>
        <input
          className="luxe-input font-mono text-sm"
          placeholder="casamento-marcio-e-ana"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          disabled={isSaving}
        />
        <p className="text-[10px] text-parchment-muted mt-1">
          Usado no QR Code: <span className="text-gold">/?evento={slug || "…"}</span>
        </p>
      </div>

      <div>
        <label className="luxe-label">Data do Evento</label>
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
            max={500}
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
            max={500}
            className="luxe-input text-center"
            value={sponsorLimit}
            onChange={(e) => setSponsorLimit(e.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <button type="submit" className="btn-gold" disabled={isSaving}>
        {isSaving ? (
          <><Loader2 size={15} className="animate-spin" /> Criando…</>
        ) : (
          <><Plus size={15} /> Criar Evento</>
        )}
      </button>
    </form>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { signOut } = useStaff();
  const navigate    = useNavigate();

  const [tab, setTab]               = useState<Tab>("events");
  const [events, setEvents]         = useState<EventRow[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [showCreateForm, setShowCreateForm]   = useState(false);

  const [activity, setActivity]     = useState<RecentPhotoEntry[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // ── Carregar eventos ───────────────────────────────────────────────────────
  useEffect(() => {
    listAllEvents()
      .then(setEvents)
      .catch(() => toast.error("Erro ao carregar eventos."))
      .finally(() => setIsLoadingEvents(false));
  }, []);

  // ── Carregar atividade quando aba ativa ────────────────────────────────────
  useEffect(() => {
    if (tab !== "activity" || activity.length > 0) return;
    setIsLoadingActivity(true);
    getRecentPhotos(30)
      .then(setActivity)
      .catch(() => toast.error("Erro ao carregar atividade."))
      .finally(() => setIsLoadingActivity(false));
  }, [tab, activity.length]);

  function handleEventCreated(event: EventRow) {
    setEvents((prev) => [event, ...prev]);
    setShowCreateForm(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="luxe-frame">
      {/* Header */}
      <div className="luxe-frame-inner pb-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] tracking-wide text-parchment-muted uppercase">
            {events.length} evento{events.length !== 1 ? "s" : ""}
          </span>
          <button onClick={signOut} className="btn-ghost text-parchment-muted">
            <LogOut size={13} /> Sair
          </button>
        </div>
        <BrandHeader subtitle="PAINEL DO ADMINISTRADOR" />

        {/* Tab Bar */}
        <div className="flex border-b border-gold-muted">
          {(
            [
              { key: "events",   label: "Eventos",    icon: <Settings size={13} /> },
              { key: "activity", label: "Atividade",  icon: <Image size={13} /> },
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

      {/* ── TAB: EVENTOS ─────────────────────────────────────────────────────── */}
      {tab === "events" && (
        <div className="flex-1 overflow-y-auto">
          <div className="luxe-frame-inner py-5">
            {/* Botão criar */}
            {!showCreateForm && (
              <button
                className="btn-gold-outline mb-5"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={15} />
                Criar Novo Evento
              </button>
            )}

            {/* Formulário de criação */}
            {showCreateForm && (
              <CreateEventForm
                onCreated={handleEventCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            )}

            {/* Lista de eventos */}
            {isLoadingEvents && (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin text-gold" />
              </div>
            )}

            {!isLoadingEvents && events.length === 0 && !showCreateForm && (
              <p className="text-parchment-muted text-sm text-center py-10">
                Nenhum evento cadastrado.
              </p>
            )}

            <div className="space-y-3">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => navigate(`/admin/evento/${event.id}`)}
                  className="luxe-card w-full p-4 flex items-center justify-between text-left hover:border-gold/50 transition-colors active:bg-gold-subtle"
                >
                  <div className="min-w-0">
                    <p className="text-parchment text-sm font-medium truncate">
                      {event.name}
                    </p>
                    <p className="text-parchment-muted text-[10px] font-mono mt-0.5">
                      /{event.slug}
                    </p>
                    {event.event_date && (
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar size={10} className="text-gold" />
                        <span className="text-[10px] text-parchment-muted">
                          {new Date(event.event_date + "T12:00:00").toLocaleDateString(
                            "pt-BR", { day: "2-digit", month: "long", year: "numeric" }
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-[10px] text-parchment-muted flex items-center gap-1">
                        <Users size={9} className="text-gold" />
                        Lim. convidado: {event.default_guest_photo_limit} fotos
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-gold flex-none ml-2" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: ATIVIDADE ───────────────────────────────────────────────────── */}
      {tab === "activity" && (
        <div className="flex-1 overflow-y-auto">
          <div className="luxe-frame-inner py-5">
            <p className="text-[10px] tracking-luxury uppercase text-gold mb-4">
              Últimas fotos enviadas
            </p>

            {isLoadingActivity && (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin text-gold" />
              </div>
            )}

            {!isLoadingActivity && activity.length === 0 && (
              <p className="text-parchment-muted text-sm text-center py-10">
                Nenhuma foto enviada ainda.
              </p>
            )}

            <div className="space-y-px">
              {activity.map((entry) => {
                const eventName =
                  events.find((e) => e.id === entry.eventId)?.name ?? "—";
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-3 border-b border-gold-muted"
                  >
                    <div>
                      <p className="text-parchment text-sm">{entry.guestName}</p>
                      <p className="text-parchment-muted text-[10px] mt-0.5">
                        {eventName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-parchment-muted">
                        {relativeTime(entry.createdAt)}
                      </span>
                      <Image size={12} className="text-gold" />
                    </div>
                  </div>
                );
              })}
            </div>

            {!isLoadingActivity && activity.length > 0 && (
              <p className="text-[10px] text-parchment-muted text-center mt-4">
                Mostrando as últimas {activity.length} fotos
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
