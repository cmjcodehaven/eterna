import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Clock, LogOut } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { useGuest } from "@/contexts/GuestContext";
import { countPendingPhotos } from "@/lib/photoStorage";

export default function Home() {
  const { guest, photosRemaining, logout } = useGuest();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  // Carrega contagem de pendentes do IndexedDB ao montar
  useEffect(() => {
    if (!guest) return;
    countPendingPhotos(guest.eventId, guest.id).then(setPendingCount);
  }, [guest]);

  // ProtectedGuestRoute garante guest !== null, mas TypeScript precisa da guarda
  if (!guest) return null;

  // restantes = limite - enviadas - pendentes (conforme regra de negócio)
  const actualRemaining = Math.max(0, photosRemaining - pendingCount);
  const progressPct = Math.min(
    100,
    Math.round((guest.uploadedCount / guest.photoLimit) * 100)
  );

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="luxe-frame">
      <div className="luxe-frame-inner flex flex-col gap-6">
        <BrandHeader subtitle="BEM-VINDO(A)" />

        {/* Nome do convidado */}
        <p className="text-center font-serif text-2xl text-parchment tracking-wide -mt-2">
          {guest.name}
        </p>

        <div className="gold-divider" />

        {/* Card de status */}
        <div className="luxe-card p-5 space-y-4">
          <p className="brand-subtitle">Seu Registro</p>

          <div className="flex items-end justify-between">
            <div className="font-serif text-4xl text-parchment leading-none">
              {guest.uploadedCount}
              <span className="text-parchment-muted text-xl">
                /{guest.photoLimit}
              </span>
            </div>
            <span className="photo-counter">fotos enviadas</span>
          </div>

          {/* Barra de progresso */}
          <div className="w-full h-0.5 bg-gold-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p className="text-parchment-muted text-xs">
            Você já enviou{" "}
            <span className="text-parchment">{guest.uploadedCount}</span> de{" "}
            <span className="text-parchment">{guest.photoLimit}</span> fotos
          </p>

          {pendingCount > 0 && (
            <p className="text-gold text-xs">
              {pendingCount} foto{pendingCount !== 1 ? "s" : ""} salva
              {pendingCount !== 1 ? "s" : ""} neste dispositivo aguardando envio
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="space-y-3">
          <button
            className="btn-gold"
            disabled={actualRemaining <= 0}
            onClick={() => navigate("/app/camera")}
          >
            <Camera size={17} />
            Abrir Câmera
          </button>

          <button
            className="btn-gold-outline"
            disabled={pendingCount === 0}
            onClick={() => navigate("/app/review")}
          >
            <Clock size={17} />
            Fotos Pendentes
            {pendingCount > 0 && (
              <span className="ml-1 bg-gold text-background text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Indicador de restantes */}
        <p className="text-center text-xs tracking-wide uppercase">
          {actualRemaining > 0 ? (
            <span className="text-parchment-muted">
              {actualRemaining} foto{actualRemaining !== 1 ? "s" : ""} disponíveis
            </span>
          ) : (
            <span className="text-gold">Limite de fotos atingido</span>
          )}
        </p>

        {/* Sair */}
        <div className="pt-2 flex justify-center">
          <button onClick={handleLogout} className="btn-ghost">
            <LogOut size={11} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
