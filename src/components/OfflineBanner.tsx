import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-[#1a1208] border-b border-gold/30 px-4 py-2 text-[11px] tracking-wide text-gold">
      <WifiOff size={12} />
      Sem conexão — fotos salvas localmente, envio pendente
    </div>
  );
}
