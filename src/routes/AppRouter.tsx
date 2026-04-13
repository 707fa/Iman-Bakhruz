import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAppStore } from "../hooks/useAppStore";
import { AuthGuard, PublicOnlyGuard } from "./guards";

const AppLayout = lazy(() => import("../layouts/AppLayout").then((module) => ({ default: module.AppLayout })));
const HomePage = lazy(() => import("../pages/HomePage").then((module) => ({ default: module.HomePage })));
const HomeCenterPage = lazy(() => import("../pages/HomeCenterPage").then((module) => ({ default: module.HomeCenterPage })));
const LoginPage = lazy(() => import("../pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("../pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const PublicTopPage = lazy(() => import("../pages/PublicTopPage").then((module) => ({ default: module.PublicTopPage })));
const StudentDashboardPage = lazy(() =>
  import("../pages/StudentDashboardPage").then((module) => ({ default: module.StudentDashboardPage })),
);
const StudentGroupPage = lazy(() => import("../pages/StudentGroupPage").then((module) => ({ default: module.StudentGroupPage })));
const StudentTopPage = lazy(() => import("../pages/StudentTopPage").then((module) => ({ default: module.StudentTopPage })));
const StudentProfilePage = lazy(() => import("../pages/StudentProfilePage").then((module) => ({ default: module.StudentProfilePage })));
const StudentSubscriptionPage = lazy(() =>
  import("../pages/StudentSubscriptionPage").then((module) => ({ default: module.StudentSubscriptionPage })),
);
const StudentPublicProfilePage = lazy(() =>
  import("../pages/StudentPublicProfilePage").then((module) => ({ default: module.StudentPublicProfilePage })),
);
const StudentToolsPage = lazy(() => import("../pages/StudentToolsPage").then((module) => ({ default: module.StudentToolsPage })));
const StudentGamesPage = lazy(() => import("../pages/StudentGamesPage").then((module) => ({ default: module.StudentGamesPage })));
const TeacherHomePage = lazy(() => import("../pages/TeacherHomePage").then((module) => ({ default: module.TeacherHomePage })));
const TeacherDashboardPage = lazy(() =>
  import("../pages/TeacherDashboardPage").then((module) => ({ default: module.TeacherDashboardPage })),
);
const TeacherGroupsPage = lazy(() => import("../pages/TeacherGroupsPage").then((module) => ({ default: module.TeacherGroupsPage })));
const TeacherTopPage = lazy(() => import("../pages/TeacherTopPage").then((module) => ({ default: module.TeacherTopPage })));
const TeacherGroupPage = lazy(() => import("../pages/TeacherGroupPage").then((module) => ({ default: module.TeacherGroupPage })));
const TeacherProfilePage = lazy(() => import("../pages/TeacherProfilePage").then((module) => ({ default: module.TeacherProfilePage })));
const TeacherStudentProfilePage = lazy(() =>
  import("../pages/TeacherStudentProfilePage").then((module) => ({ default: module.TeacherStudentProfilePage })),
);
const TeacherToolsPage = lazy(() => import("../pages/TeacherToolsPage").then((module) => ({ default: module.TeacherToolsPage })));
const TeacherGamesPage = lazy(() => import("../pages/TeacherGamesPage").then((module) => ({ default: module.TeacherGamesPage })));
const FriendlyChatPage = lazy(() => import("../pages/FriendlyChatPage").then((module) => ({ default: module.FriendlyChatPage })));
const ImanAiChatPage = lazy(() => import("../pages/ImanAiChatPage").then((module) => ({ default: module.ImanAiChatPage })));

function RootRedirect() {
  const { state } = useAppStore();
  const session = state.session;

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (session.role === "teacher") {
    return <Navigate to="/teacher" replace />;
  }

  return <Navigate to="/student" replace />;
}

export function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center bg-white px-4 text-center text-charcoal dark:bg-black dark:text-white">
          <p className="text-sm font-semibold">Loading...</p>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home-center" element={<HomeCenterPage />} />
        <Route path="/dashboard" element={<RootRedirect />} />
        <Route path="/top" element={<PublicTopPage />} />

        <Route element={<PublicOnlyGuard />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<AuthGuard role="student" />}>
          <Route element={<AppLayout />}>
            <Route path="/student" element={<StudentDashboardPage />} />
            <Route path="/student/group" element={<StudentGroupPage />} />
            <Route path="/student/games" element={<StudentGamesPage />} />
            <Route path="/student/top" element={<StudentTopPage />} />
            <Route path="/student/subscription" element={<StudentSubscriptionPage />} />
            <Route path="/student/tools" element={<StudentToolsPage />} />
            <Route path="/student/chat" element={<FriendlyChatPage />} />
            <Route path="/student/ai-chat" element={<ImanAiChatPage />} />
            <Route path="/student/profile/:id" element={<StudentPublicProfilePage />} />
            <Route path="/profile" element={<StudentProfilePage />} />
          </Route>
        </Route>

        <Route element={<AuthGuard role="teacher" />}>
          <Route element={<AppLayout />}>
            <Route path="/teacher" element={<TeacherHomePage />} />
            <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
            <Route path="/teacher/groups" element={<TeacherGroupsPage />} />
            <Route path="/teacher/games" element={<TeacherGamesPage />} />
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
    </Suspense>
  );
}
