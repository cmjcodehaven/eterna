import { useNavigate } from "react-router-dom";
import BrandHeader from "@/components/BrandHeader";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="luxe-frame items-center justify-center">
      <div className="luxe-frame-inner text-center space-y-6">
        <BrandHeader subtitle="PÁGINA NÃO ENCONTRADA" />
        <p className="font-serif text-5xl text-gold">404</p>
        <p className="text-parchment-muted text-sm">
          Esta página não existe ou foi removida.
        </p>
        <button onClick={() => navigate("/")} className="btn-gold-outline">
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
