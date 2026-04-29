import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppStore } from "../hooks/useAppStore";
import type { UserRole } from "../types";

const ONLY_SUPPORT_AND_RATINGS_ENABLED = true;
const FULL_ACCESS_STUDENT_PHONES = new Set(["998978778177"]);

function normalizePhone(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function isFullAccessStudent(phone: string | undefined): boolean {
  return FULL_ACCESS_STUDENT_PHONES.has(normalizePhone(phone));
}

function roleHome(role: UserRole): string {
  if (role === "teacher") return "/teacher";
  if (role === "parent") return "/parent";
  return "/student";
}

function isLockedStudentPage(pathname: string): boolean {
  return (
    pathname.startsWith("/student/games") ||
    pathname.startsWith("/student/speaking") ||
    pathname.startsWith("/student/chat") ||
    pathname.startsWith("/student/ai-chat")
  );
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
  const { state, currentStudent } = useAppStore();
  const session = state.session;

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
