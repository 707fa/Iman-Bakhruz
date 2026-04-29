import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppStore } from "../hooks/useAppStore";
import type { UserRole } from "../types";

const ONLY_SUPPORT_AND_RATINGS_ENABLED = true;

function roleHome(role: UserRole): string {
  if (role === "teacher") return "/teacher";
  if (role === "parent") return "/parent";
  return "/student";
}

function temporaryOpenPage(role: UserRole): string {
  if (role === "teacher") return "/teacher/top";
  if (role === "student") return "/student/top";
  return "/top";
}

function isTemporaryOpenPage(pathname: string, role: UserRole): boolean {
  if (role === "teacher") {
    return pathname.startsWith("/teacher/top") || pathname.startsWith("/teacher/support");
  }

  if (role === "student") {
    return (
      pathname.startsWith("/student/top") ||
      pathname.startsWith("/student/support") ||
      pathname.startsWith("/student/profile")
    );
  }

  return false;
}

export function PublicOnlyGuard() {
  const { state } = useAppStore();
  const session = state.session;

  if (!session) {
    return <Outlet />;
  }

  return <Navigate to="/" replace />;
}

interface AuthGuardProps {
  role: UserRole;
}

export function AuthGuard({ role }: AuthGuardProps) {
  const location = useLocation();
  const { state, currentStudentAccess } = useAppStore();
  const session = state.session;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role !== role) {
    return <Navigate to={roleHome(session.role)} replace />;
  }

  if (ONLY_SUPPORT_AND_RATINGS_ENABLED && !isTemporaryOpenPage(location.pathname, session.role)) {
    return <Navigate to={temporaryOpenPage(session.role)} replace />;
  }

  if (session.role === "student") {
    const isPaid = Boolean(currentStudentAccess?.hasFullAccess);

    if (!isPaid) {
      const isStudentHome = location.pathname === "/student";
      const allowedPrefixes = ["/student/top", "/student/group", "/student/subscription", "/student/support"];
      const isAllowed = isStudentHome || allowedPrefixes.some((path) => location.pathname.startsWith(path));
      if (!isAllowed) {
        return <Navigate to="/student/subscription" replace />;
      }
    }
  }

  return <Outlet />;
}
