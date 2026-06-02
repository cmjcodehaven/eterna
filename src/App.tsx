import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { GuestProvider, useGuest } from "@/contexts/GuestContext";
import { StaffProvider }           from "@/contexts/StaffContext";
import ProtectedStaffRoute         from "@/components/ProtectedStaffRoute";
import Login          from "@/pages/Login";
import Home           from "@/pages/Home";
import Camera         from "@/pages/Camera";
import Review         from "@/pages/Review";
import StaffLogin     from "@/pages/StaffLogin";
import CoupleDashboard    from "@/pages/CoupleDashboard";
import Curatorship        from "@/pages/Curatorship";
import AdminDashboard     from "@/pages/AdminDashboard";
import AdminEventDetail   from "@/pages/AdminEventDetail";
import NotFound           from "@/pages/NotFound";

// ─── Guest route guard ────────────────────────────────────────────────────────

function ProtectedGuestRoute({ children }: { children: React.ReactNode }) {
  const { guest } = useGuest();
  if (!guest) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ─── Route tree ───────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
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
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <StaffProvider>
        <GuestProvider>
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
