import { Navigate, Route, Routes } from "react-router-dom";
import { useAppStore } from "../hooks/useAppStore";
import { AppLayout } from "../layouts/AppLayout";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { PublicTopPage } from "../pages/PublicTopPage";
import { StudentDashboardPage } from "../pages/StudentDashboardPage";
import { StudentGroupPage } from "../pages/StudentGroupPage";
import { StudentPublicProfilePage } from "../pages/StudentPublicProfilePage";
import { StudentProfilePage } from "../pages/StudentProfilePage";
import { StudentTopPage } from "../pages/StudentTopPage";
import { TeacherDashboardPage } from "../pages/TeacherDashboardPage";
import { TeacherGroupPage } from "../pages/TeacherGroupPage";
import { TeacherProfilePage } from "../pages/TeacherProfilePage";
import { TeacherStudentProfilePage } from "../pages/TeacherStudentProfilePage";
import { AuthGuard, PublicOnlyGuard } from "./guards";

function RootRedirect() {
  const { state } = useAppStore();
  const session = state.session;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role === "teacher") {
    return <Navigate to="/teacher" replace />;
  }

  return <Navigate to="/student" replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/top" element={<PublicTopPage />} />
      <Route element={<PublicOnlyGuard />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<AuthGuard role="student" />}>
        <Route element={<AppLayout />}>
          <Route path="/student" element={<StudentDashboardPage />} />
          <Route path="/student/group" element={<StudentGroupPage />} />
          <Route path="/student/top" element={<StudentTopPage />} />
          <Route path="/student/profile/:id" element={<StudentPublicProfilePage />} />
          <Route path="/profile" element={<StudentProfilePage />} />
        </Route>
      </Route>

      <Route element={<AuthGuard role="teacher" />}>
        <Route element={<AppLayout />}>
          <Route path="/teacher" element={<TeacherDashboardPage />} />
          <Route path="/teacher/group/:id" element={<TeacherGroupPage />} />
          <Route path="/teacher/student/:id" element={<TeacherStudentProfilePage />} />
          <Route path="/teacher/profile" element={<TeacherProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
