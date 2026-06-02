import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useStaff } from "@/contexts/StaffContext";
import type { AppRole } from "@/types/domain";

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedStaffRoute({ children, allowedRoles }: Props) {
  const { user, role, isLoading } = useStaff();

  if (isLoading) {
    return (
      <div className="luxe-frame items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gold" />
      </div>
    );
  }

  if (!user || !role) return <Navigate to="/staff" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/staff" replace />;
  }

  return <>{children}</>;
}
