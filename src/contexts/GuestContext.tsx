import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { isValidPhoneBR, normalizePhoneBR } from "@/lib/phone";
import type { GuestLoginResponse, GuestSession } from "@/types/domain";

// ─── Constantes ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "eterna:guestSession";

const DEFAULT_EVENT_SLUG =
  import.meta.env.VITE_DEFAULT_EVENT_SLUG ?? "casamento-eterna";

// ─── Tipo do contexto ─────────────────────────────────────────────────────────

interface GuestContextValue {
  /** Sessão ativa do convidado. null = não logado. */
  guest: GuestSession | null;
  /** true enquanto a Edge Function está sendo chamada */
  isLoading: boolean;
  /**
   * Fotos que o convidado ainda pode enviar = photoLimit - uploadedCount.
   * Não inclui fotos pendentes locais — subtraia-as nos componentes de câmera/revisão.
   */
  photosRemaining: number;
  /** Faz login por telefone. Lança erro com mensagem amigável em caso de falha. */
  login: (phone: string) => Promise<void>;
  /** Encerra a sessão local do convidado. */
  logout: () => void;
  /**
   * Rebusca uploadedCount da Edge Function.
   * Chamar após envio confirmado para sincronizar o contador com o servidor.
   */
  refreshUploadedCount: () => Promise<void>;
  /**
   * Incrementa uploadedCount localmente após upload bem-sucedido,
   * sem precisar de uma chamada extra à rede.
   */
  incrementUploadedCount: (by: number) => void;
}

// ─── Criação do contexto ──────────────────────────────────────────────────────

const GuestContext = createContext<GuestContextValue | null>(null);

// ─── Helpers de persistência ──────────────────────────────────────────────────

function loadStoredGuest(): GuestSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestSession;
    // Valida campos mínimos para evitar dados corrompidos
    if (!parsed.id || !parsed.phoneDigits || !parsed.eventId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistGuest(session: GuestSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearPersistedGuest(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GuestProvider({ children }: { children: React.ReactNode }) {
  // Inicialização lazy: lê localStorage antes do primeiro render.
  // O convidado está disponível imediatamente — sem flash de estado null.
  const [guest, setGuest] = useState<GuestSession | null>(() =>
    loadStoredGuest()
  );
  const [isLoading, setIsLoading] = useState(false);

  // Ref estável para acessar o guest atual sem reconstruir callbacks
  const guestRef = useRef(guest);
  useEffect(() => {
    guestRef.current = guest;
  }, [guest]);

  // Sincroniza qualquer mudança de guest com localStorage automaticamente
  useEffect(() => {
    if (guest) {
      persistGuest(guest);
    } else {
      clearPersistedGuest();
    }
  }, [guest]);

  const photosRemaining = guest
    ? Math.max(0, guest.photoLimit - guest.uploadedCount)
    : 0;

  // ─── login ──────────────────────────────────────────────────────────────────

  const login = useCallback(async (phone: string): Promise<void> => {
    const digits = normalizePhoneBR(phone);

    if (!isValidPhoneBR(digits)) {
      throw new Error(
        "Telefone inválido. Informe o DDD seguido do número (10 ou 11 dígitos)."
      );
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<GuestLoginResponse>(
        "guest-login",
        {
          body: { eventSlug: DEFAULT_EVENT_SLUG, phone: digits },
        }
      );

      if (error) {
        // Tenta extrair mensagem amigável da resposta da Edge Function
        const message =
          typeof error.context === "object" &&
          error.context !== null &&
          "message" in error.context
            ? String((error.context as { message: string }).message)
            : "Convidado não encontrado. Verifique o telefone ou fale com a recepção.";
        throw new Error(message);
      }

      if (!data?.guest) {
        throw new Error(
          "Convidado não encontrado. Verifique o telefone ou fale com a recepção."
        );
      }

      const session: GuestSession = {
        id: data.guest.id,
        eventId: data.guest.eventId,
        name: data.guest.name,
        phoneDigits: data.guest.phoneDigits,
        guestType: data.guest.guestType,
        photoLimit: data.guest.photoLimit,
        uploadedCount: data.uploadedCount,
      };

      setGuest(session);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── logout ─────────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    setGuest(null);
  }, []);

  // ─── refreshUploadedCount ────────────────────────────────────────────────────

  const refreshUploadedCount = useCallback(async (): Promise<void> => {
    const current = guestRef.current;
    if (!current) return;

    try {
      const { data, error } = await supabase.functions.invoke<GuestLoginResponse>(
        "guest-login",
        {
          body: {
            eventSlug: DEFAULT_EVENT_SLUG,
            phone: current.phoneDigits,
          },
        }
      );

      if (!error && data) {
        setGuest((prev) =>
          prev ? { ...prev, uploadedCount: data.uploadedCount } : prev
        );
      }
    } catch {
      // Falha silenciosa: mantém o contador local atual
    }
  }, []); // guestRef é estável, sem dependências voláteis

  // ─── incrementUploadedCount ──────────────────────────────────────────────────

  const incrementUploadedCount = useCallback((by: number): void => {
    setGuest((prev) =>
      prev ? { ...prev, uploadedCount: prev.uploadedCount + by } : prev
    );
  }, []);

  return (
    <GuestContext.Provider
      value={{
        guest,
        isLoading,
        photosRemaining,
        login,
        logout,
        refreshUploadedCount,
        incrementUploadedCount,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}

// ─── Hook de consumo ──────────────────────────────────────────────────────────

export function useGuest(): GuestContextValue {
  const ctx = useContext(GuestContext);
  if (!ctx) {
    throw new Error("useGuest deve ser usado dentro de <GuestProvider>.");
  }
  return ctx;
}
