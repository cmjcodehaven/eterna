import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Suspense, lazy } from "react";
import { GuestProvider, useGuest } from "@/contexts/GuestContext";
import { StaffProvider }           from "@/contexts/StaffContext";
import ProtectedStaffRoute         from "@/components/ProtectedStaffRoute";
import OfflineBanner               from "@/components/OfflineBanner";

// Rotas do convidado — carregadas imediatamente (caminho crítico)
import Login   from "@/pages/Login";
import Home    from "@/pages/Home";
import Camera  from "@/pages/Camera";
import Review  from "@/pages/Review";

// Rotas de staff/admin — lazy (convidado nunca precisa delas)
const StaffLogin       = lazy(() => import("@/pages/StaffLogin"));
const CoupleDashboard  = lazy(() => import("@/pages/CoupleDashboard"));
const Curatorship      = lazy(() => import("@/pages/Curatorship"));
const AdminDashboard   = lazy(() => import("@/pages/AdminDashboard"));
const AdminEventDetail = lazy(() => import("@/pages/AdminEventDetail"));
const NotFound         = lazy(() => import("@/pages/NotFound"));

// ─── Guest route guard ────────────────────────────────────────────────────────

function ProtectedGuestRoute({ children }: { children: React.ReactNode }) {
  const { guest } = useGuest();
  if (!guest) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ─── Route tree ───────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
    <Routes>
      {/* ── Guest area ─────────────────────────────────────── */}
      <Route path="/" element={<Login />} />
      <Route
        path="/app"
        element={<ProtectedGuestRoute><Home /></ProtectedGuestRoute>}
      />
      <Route
        path="/app/camera"
        element={<ProtectedGuestRoute><Camera /></ProtectedGuestRoute>}
      />
      <Route
        path="/app/review"
        element={<ProtectedGuestRoute><Review /></ProtectedGuestRoute>}
      />

      {/* ── Staff area ─────────────────────────────────────── */}
      <Route path="/staff" element={<StaffLogin />} />

      <Route
        path="/couple"
        element={
          <ProtectedStaffRoute allowedRoles={["couple", "admin"]}>
            <CoupleDashboard />
          </ProtectedStaffRoute>
        }
      />
      <Route
        path="/couple/curadoria"
        element={
          <ProtectedStaffRoute allowedRoles={["couple", "admin"]}>
            <Curatorship />
          </ProtectedStaffRoute>
        }
      />

      {/* ── Admin area ─────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <ProtectedStaffRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedStaffRoute>
        }
      />
      <Route
        path="/admin/evento/:eventId"
        element={
          <ProtectedStaffRoute allowedRoles={["admin"]}>
            <AdminEventDetail />
          </ProtectedStaffRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <StaffProvider>
        <GuestProvider>
          <OfflineBanner />
          <AppRoutes />
          <Toaster
            position="top-center"
            theme="dark"
            richColors
            toastOptions={{
              style: {
                background: "#121212",
                border: "1px solid rgba(201, 162, 77, 0.25)",
                color: "#f7f0df",
                fontFamily: "Inter, system-ui, sans-serif",
              },
            }}
          />
        </GuestProvider>
      </StaffProvider>
    </BrowserRouter>
  );
}
