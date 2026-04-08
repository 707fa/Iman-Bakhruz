import { Navigate, Route, Routes } from "react-router-dom";
import { useAppStore } from "../hooks/useAppStore";
import { AppLayout } from "../layouts/AppLayout";
import { FriendlyChatPage } from "../pages/FriendlyChatPage";
import { ImanAiChatPage } from "../pages/ImanAiChatPage";
import { LoginPage } from "../pages/LoginPage";
import { PublicTopPage } from "../pages/PublicTopPage";
import { RegisterPage } from "../pages/RegisterPage";
import { StudentDashboardPage } from "../pages/StudentDashboardPage";
import { StudentGroupPage } from "../pages/StudentGroupPage";
import { StudentProfilePage } from "../pages/StudentProfilePage";
import { StudentPublicProfilePage } from "../pages/StudentPublicProfilePage";
import { StudentToolsPage } from "../pages/StudentToolsPage";
import { StudentTopPage } from "../pages/StudentTopPage";
import { TeacherDashboardPage } from "../pages/TeacherDashboardPage";
import { TeacherGroupPage } from "../pages/TeacherGroupPage";
import { TeacherGroupsPage } from "../pages/TeacherGroupsPage";
import { TeacherProfilePage } from "../pages/TeacherProfilePage";
import { TeacherStudentProfilePage } from "../pages/TeacherStudentProfilePage";
import { TeacherToolsPage } from "../pages/TeacherToolsPage";
import { TeacherTopPage } from "../pages/TeacherTopPage";
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
          <Route path="/student/tools" element={<StudentToolsPage />} />
          <Route path="/student/chat" element={<FriendlyChatPage />} />
          <Route path="/student/ai-chat" element={<ImanAiChatPage />} />
          <Route path="/student/profile/:id" element={<StudentPublicProfilePage />} />
          <Route path="/profile" element={<StudentProfilePage />} />
        </Route>
      </Route>

      <Route element={<AuthGuard role="teacher" />}>
        <Route element={<AppLayout />}>
          <Route path="/teacher" element={<TeacherDashboardPage />} />
          <Route path="/teacher/groups" element={<TeacherGroupsPage />} />
          <Route path="/teacher/top" element={<TeacherTopPage />} />
          <Route path="/teacher/tools" element={<TeacherToolsPage />} />
          <Route path="/teacher/chat" element={<FriendlyChatPage />} />
          <Route path="/teacher/ai-chat" element={<ImanAiChatPage />} />
          <Route path="/teacher/group/:id" element={<TeacherGroupPage />} />
          <Route path="/teacher/student/:id" element={<TeacherStudentProfilePage />} />
          <Route path="/teacher/profile" element={<TeacherProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
