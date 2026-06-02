import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn, Loader2 } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { useStaff } from "@/contexts/StaffContext";

export default function StaffLogin() {
  const { signIn, user, role, isLoading: staffLoading } = useStaff();
  const navigate = useNavigate();

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!staffLoading && user && role) {
      navigate(role === "admin" ? "/admin" : "/couple", { replace: true });
    }
  }, [user, role, staffLoading, navigate]);

  if (staffLoading) {
    return (
      <div className="luxe-frame items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gold" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar.");
      setIsSubmitting(false);
    }
  }

  const canSubmit = email.includes("@") && password.length >= 6 && !isSubmitting;

  return (
    <div className="luxe-frame">
      <div className="luxe-frame-inner flex-1 flex flex-col justify-center">
        <BrandHeader subtitle="ÁREA RESTRITA" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] tracking-luxury uppercase text-gold mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              className="luxe-input"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-luxury uppercase text-gold mb-1.5">
              Senha
            </label>
            <input
              type="password"
              className="luxe-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn-gold w-full mt-6"
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Entrando…
              </>
            ) : (
              <>
                <LogIn size={15} />
                Entrar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
