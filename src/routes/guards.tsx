import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppStore } from "../hooks/useAppStore";
import { isFullAccessStudent, ONLY_SUPPORT_AND_RATINGS_ENABLED } from "../lib/featureFlags";
import type { UserRole } from "../types";

function roleHome(role: UserRole): string {
  if (role === "teacher") return "/teacher";
  if (role === "parent") return "/parent";
  return "/student";
}

function isLockedStudentPage(pathname: string): boolean {
  return (
    pathname.startsWith("/student/games") ||
    pathname.startsWith("/student/speaking") ||
    pathname.startsWith("/student/ai-chat")
  );
}

export function AuthLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-white px-4 text-center text-charcoal dark:bg-black dark:text-white">
      <p className="text-sm font-semibold">Loading...</p>
    </div>
  );
}

export function PublicOnlyGuard() {
  const { state, authRestoring } = useAppStore();
  const session = state.session;

  if (!session && authRestoring) {
    return <AuthLoading />;
  }

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
  const { state, currentStudent, authRestoring } = useAppStore();
  const session = state.session;

  if (!session && authRestoring) {
    return <AuthLoading />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role !== role) {
    return <Navigate to={roleHome(session.role)} replace />;
  }

  const shouldLockStudentFeatures =
    ONLY_SUPPORT_AND_RATINGS_ENABLED &&
    session.role === "student" &&
    !isFullAccessStudent(currentStudent?.phone);

  if (shouldLockStudentFeatures && isLockedStudentPage(location.pathname)) {
    return <Navigate to="/student" replace />;
  }

  if (session.role === "student") {
    if (isFullAccessStudent(currentStudent?.phone)) {
      return <Outlet />;
    }
  }

  return <Outlet />;
}
