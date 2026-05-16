import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

const PortfolioPage = lazy(() => import("../pages/PortfolioPage").then((m) => ({ default: m.PortfolioPage })));
const CoursePage = lazy(() => import("../pages/CoursePage").then((m) => ({ default: m.CoursePage })));

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<PortfolioPage />} />
        <Route path="/course" element={<CoursePage />} />
        <Route path="*" element={<PortfolioPage />} />
      </Routes>
    </Suspense>
  );
}
