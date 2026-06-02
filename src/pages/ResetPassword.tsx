import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";

export default function ResetPassword() {
  const navigate  = useNavigate();
  const [password, setPassword]   = useState("");
  const [confirm,  setConfirm]    = useState("");
  const [ready,    setReady]      = useState(false);
  const [saving,   setSaving]     = useState(false);

  // Supabase coloca o token no hash — precisamos trocar por sessão
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success("Senha atualizada! Redirecionando…");
    setTimeout(() => navigate("/staff"), 1500);
  }

  return (
    <div className="luxe-frame">
      <div className="luxe-frame-inner flex flex-col gap-6">
        <BrandHeader subtitle="REDEFINIR SENHA" />

        {!ready ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 size={24} className="animate-spin text-gold" />
            <p className="text-parchment-muted text-sm">Verificando token…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-luxury uppercase text-parchment-muted">
                Nova senha
              </label>
              <input
                type="password"
                className="luxe-input"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-luxury uppercase text-parchment-muted">
                Confirmar senha
              </label>
              <input
                type="password"
                className="luxe-input"
                placeholder="Repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={saving}
              />
            </div>
            <button type="submit" className="btn-gold w-full" disabled={saving}>
              {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
