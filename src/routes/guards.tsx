import { Navigate, Outlet, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const { state } = useAppStore();
  const session = state.session;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role !== role) {
    return <Navigate to={roleHome(session.role)} replace />;
  }

  if (session.role === "student" && session.isPaid === false) {
    const allowedPaths = ["/student/top", "/student/group", "/student/subscription"];
    const isAllowed = allowedPaths.some((path) => location.pathname.startsWith(path));
    if (!isAllowed) {
      return <Navigate to="/student/subscription" replace />;
    }
  }

  return <Outlet />;
}
