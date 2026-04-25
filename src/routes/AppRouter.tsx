import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAppStore } from "../hooks/useAppStore";
import { AuthGuard, PublicOnlyGuard } from "./guards";

const AppLayout = lazy(() => import("../layouts/AppLayout").then((module) => ({ default: module.AppLayout })));
const HomePage = lazy(() => import("../pages/HomePage").then((module) => ({ default: module.HomePage })));
const HomeCenterPage = lazy(() => import("../pages/HomeCenterPage").then((module) => ({ default: module.HomeCenterPage })));
const LoginPage = lazy(() => import("../pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("../pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const ParentRegisterPage = lazy(() => import("../pages/ParentRegisterPage").then((module) => ({ default: module.ParentRegisterPage })));
const PublicTopPage = lazy(() => import("../pages/PublicTopPage").then((module) => ({ default: module.PublicTopPage })));
const StudentDashboardPage = lazy(() =>
  import("../pages/StudentDashboardPage").then((module) => ({ default: module.StudentDashboardPage })),
);
const StudentGroupPage = lazy(() => import("../pages/StudentGroupPage").then((module) => ({ default: module.StudentGroupPage })));
const StudentTopPage = lazy(() => import("../pages/StudentTopPage").then((module) => ({ default: module.StudentTopPage })));
const StudentSpeakingPage = lazy(() =>
  import("../pages/StudentSpeakingPage").then((module) => ({ default: module.StudentSpeakingPage })),
);
const StudentProfilePage = lazy(() => import("../pages/StudentProfilePage").then((module) => ({ default: module.StudentProfilePage })));
const StudentSubscriptionPage = lazy(() =>
  import("../pages/StudentSubscriptionPage").then((module) => ({ default: module.StudentSubscriptionPage })),
);
const StudentPublicProfilePage = lazy(() =>
  import("../pages/StudentPublicProfilePage").then((module) => ({ default: module.StudentPublicProfilePage })),
);
const StudentGamesPage = lazy(() => import("../pages/StudentGamesPage").then((module) => ({ default: module.StudentGamesPage })));
const StudentKetkaPlayPage = lazy(() =>
  import("../pages/StudentKetkaPlayPage").then((module) => ({ default: module.StudentKetkaPlayPage })),
);
const TeacherHomePage = lazy(() => import("../pages/TeacherHomePage").then((module) => ({ default: module.TeacherHomePage })));
const TeacherGroupsPage = lazy(() => import("../pages/TeacherGroupsPage").then((module) => ({ default: module.TeacherGroupsPage })));
const TeacherTopPage = lazy(() => import("../pages/TeacherTopPage").then((module) => ({ default: module.TeacherTopPage })));
const TeacherGroupPage = lazy(() => import("../pages/TeacherGroupPage").then((module) => ({ default: module.TeacherGroupPage })));
const TeacherProfilePage = lazy(() => import("../pages/TeacherProfilePage").then((module) => ({ default: module.TeacherProfilePage })));
const TeacherStudentProfilePage = lazy(() =>
  import("../pages/TeacherStudentProfilePage").then((module) => ({ default: module.TeacherStudentProfilePage })),
);
const ParentDashboardPage = lazy(() => import("../pages/ParentDashboardPage").then((module) => ({ default: module.ParentDashboardPage })));
const ParentProfilePage = lazy(() => import("../pages/ParentProfilePage").then((module) => ({ default: module.ParentProfilePage })));
const SupportPage = lazy(() => import("../pages/SupportPage").then((module) => ({ default: module.SupportPage })));

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

  if (session.role === "parent") {
    return <Navigate to="/parent" replace />;
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
          <Route path="/register/parent" element={<ParentRegisterPage />} />
        </Route>

        <Route element={<AuthGuard role="student" />}>
          <Route element={<AppLayout />}>
            <Route path="/student" element={<StudentDashboardPage />} />
            <Route path="/student/group" element={<StudentGroupPage />} />
            <Route path="/student/games" element={<StudentGamesPage />} />
            <Route path="/student/games/ketka-play" element={<StudentKetkaPlayPage />} />
            <Route path="/student/top" element={<StudentTopPage />} />
            <Route path="/student/speaking" element={<StudentSpeakingPage />} />
            <Route path="/student/parent" element={<Navigate to="/student" replace />} />
            <Route path="/student/subscription" element={<StudentSubscriptionPage />} />
            <Route path="/student/tools" element={<Navigate to="/student" replace />} />
            <Route path="/student/chat" element={<FriendlyChatPage />} />
            <Route path="/student/ai-chat" element={<ImanAiChatPage />} />
            <Route path="/student/support" element={<SupportPage />} />
            <Route path="/student/profile/:id" element={<StudentPublicProfilePage />} />
            <Route path="/profile" element={<StudentProfilePage />} />
          </Route>
        </Route>

        <Route element={<AuthGuard role="teacher" />}>
          <Route element={<AppLayout />}>
            <Route path="/teacher" element={<TeacherHomePage />} />
            <Route path="/teacher/dashboard" element={<Navigate to="/teacher" replace />} />
            <Route path="/teacher/groups" element={<TeacherGroupsPage />} />
            <Route path="/teacher/top" element={<TeacherTopPage />} />
            <Route path="/teacher/tools" element={<Navigate to="/teacher" replace />} />
            <Route path="/teacher/chat" element={<FriendlyChatPage />} />
            <Route path="/teacher/ai-chat" element={<ImanAiChatPage />} />
            <Route path="/teacher/support" element={<SupportPage />} />
            <Route path="/teacher/group/:id" element={<TeacherGroupPage />} />
            <Route path="/teacher/student/:id" element={<TeacherStudentProfilePage />} />
            <Route path="/teacher/profile" element={<TeacherProfilePage />} />
          </Route>
        </Route>

        <Route element={<AuthGuard role="parent" />}>
          <Route element={<AppLayout />}>
            <Route path="/parent" element={<ParentDashboardPage />} />
            <Route path="/parent/profile" element={<ParentProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
