// ─── Enums de domínio ────────────────────────────────────────────────────────

export type GuestType = "guest" | "sponsor";
export type AppRole = "admin" | "couple";

// ─── Evento ──────────────────────────────────────────────────────────────────

export interface EventRecord {
  id: string;
  name: string;
  eventDate: string | null;
  slug: string;
  defaultGuestPhotoLimit: number;
  defaultSponsorPhotoLimit: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Convidado ───────────────────────────────────────────────────────────────

/** Registro completo de convidado (usado no painel de staff) */
export interface GuestRecord {
  id: string;
  eventId: string;
  name: string;
  phoneDigits: string;
  guestType: GuestType;
  photoLimit: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sessão ativa do convidado persistida no localStorage.
 * Inclui uploadedCount para o cálculo de fotos restantes.
 */
export interface GuestSession {
  id: string;
  eventId: string;
  name: string;
  phoneDigits: string;
  guestType: GuestType;
  photoLimit: number;
  uploadedCount: number;
}

// ─── Fotos ───────────────────────────────────────────────────────────────────

/** Foto armazenada no banco (retornada para staff) */
export interface PhotoItem {
  id: string;
  eventId: string;
  guestId: string;
  guestName: string;
  guestPhoneDigits: string;
  storagePath: string;
  /** URL assinada — preenchida no frontend após busca */
  url?: string;
  selected: boolean;
  selectedAt?: string;
  createdAt: string;
}

/** Foto pendente salva localmente antes do envio (IndexedDB via localforage) */
export interface PendingPhoto {
  localId: string;
  /** Data URL gerada pelo canvas (imagem polaroid) */
  dataUrl: string;
  capturedAt: string;
}

// ─── Respostas das Edge Functions ────────────────────────────────────────────

/** Resposta de guest-login */
export interface GuestLoginResponse {
  guest: {
    id: string;
    eventId: string;
    name: string;
    phoneDigits: string;
    guestType: GuestType;
    photoLimit: number;
  };
  uploadedCount: number;
}

/** Resposta de submit-photos */
export interface SubmitPhotosResponse {
  ok: boolean;
  uploaded: number;
}

// ─── Erros tipados ───────────────────────────────────────────────────────────

export type GuestLoginError =
  | "INVALID_PHONE"
  | "EVENT_NOT_FOUND"
  | "GUEST_NOT_FOUND"
  | "SERVER_ERROR";
