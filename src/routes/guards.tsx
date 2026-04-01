import { Navigate, Outlet } from "react-router-dom";
import { useAppStore } from "../hooks/useAppStore";
import type { UserRole } from "../types";

function roleHome(role: UserRole): string {
  if (role === "teacher") return "/teacher";
  return "/student";
}

export function PublicOnlyGuard() {
  const { state } = useAppStore();
  const session = state.session;

  if (!session) {
    return <Outlet />;
  }

  return <Navigate to={roleHome(session.role)} replace />;
}

interface AuthGuardProps {
  role: UserRole;
}

export function AuthGuard({ role }: AuthGuardProps) {
  const { state } = useAppStore();
  const session = state.session;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role !== role) {
    return <Navigate to={roleHome(session.role)} replace />;
  }

  return <Outlet />;
}
