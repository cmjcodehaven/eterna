import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { useGuest } from "@/contexts/GuestContext";
import { formatPhoneBR, isValidPhoneBR } from "@/lib/phone";

export default function Login() {
  const { guest, isLoading, login } = useGuest();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");

  // Já logado — redireciona sem renderizar o formulário (sem flash)
  if (guest) {
    return <Navigate to="/app" replace />;
  }

  const canSubmit = isValidPhoneBR(phone) && !isLoading;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await login(phone);
      navigate("/app", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao verificar acesso.");
    }
  }

  return (
    <div className="luxe-frame items-center justify-center">
      <div className="luxe-frame-inner flex flex-col justify-center flex-1">
        <BrandHeader subtitle="FOTÓGRAFOS DO EVENTO" />

        <p className="text-center text-parchment-muted text-sm leading-relaxed mb-8">
          Para começar a registrar momentos,
          <br />
          informe seu telefone cadastrado.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="phone" className="luxe-label">
              Telefone
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
              className="luxe-input"
              autoComplete="tel"
              disabled={isLoading}
            />
          </div>

          <button type="submit" disabled={!canSubmit} className="btn-gold">
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Verificando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <div className="mt-12 text-center">
          <a href="/staff" className="btn-ghost mx-auto">
            Área restrita · Noivos &amp; Equipe
          </a>
        </div>
      </div>

      <footer className="pb-6 text-center">
        <p className="text-[10px] tracking-luxury text-parchment-muted/40 uppercase">
          Eterna Photos
        </p>
      </footer>
    </div>
  );
}
