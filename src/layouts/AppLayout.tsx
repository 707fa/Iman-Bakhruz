import { CreditCard, Gamepad2, GraduationCap, LayoutDashboard, MessageCircle, Mic, Trophy, UsersRound } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";
import { UserMenu } from "../components/UserMenu";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { cn } from "../lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

function isItemActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function navItemClass(active: boolean): string {
  if (active) {
    return "bg-gradient-to-br from-burgundy-600 via-burgundy-700 to-burgundy-800 text-white shadow-soft";
  }
  return "text-charcoal/75 hover:bg-burgundy-50/80 hover:text-charcoal dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white";
}

export function AppLayout() {
  const location = useLocation();
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const { state, currentStudent, currentStudentAccess, currentTeacher, currentParent, logout } = useAppStore();
  const { t } = useUi();
  const session = state.session;

  if (!session) {
    return null;
  }

  const mainNavMap: Record<"student" | "teacher" | "parent", NavItem[]> = {
    student: [
      { label: t("nav.student"), href: "/student", icon: LayoutDashboard, exact: true },
      { label: t("tabs.group"), href: "/student/group", icon: UsersRound },
      { label: t("tabs.global"), href: "/student/top", icon: Trophy },
      { label: t("nav.speaking"), href: "/student/speaking", icon: Mic },
    ],
    teacher: [
      { label: t("nav.teacher"), href: "/teacher", icon: LayoutDashboard, exact: true },
      { label: t("nav.teacherGroups"), href: "/teacher/groups", icon: UsersRound },
      { label: t("nav.teacherTop"), href: "/teacher/top", icon: Trophy },
    ],
    parent: [
      { label: t("nav.parent"), href: "/parent", icon: LayoutDashboard, exact: true },
    ],
  };

  const chatNavMap: Record<"student" | "teacher" | "parent", NavItem[]> = {
    student: [
      { label: t("nav.friendly"), href: "/student/chat", icon: MessageCircle },
      { label: t("nav.aiChat"), href: "/student/ai-chat", icon: MessageCircle },
    ],
    teacher: [
      { label: t("nav.friendly"), href: "/teacher/chat", icon: MessageCircle },
      { label: t("nav.aiChat"), href: "/teacher/ai-chat", icon: MessageCircle },
    ],
    parent: [],
  };

  const gamesNavMap: Record<"student" | "teacher" | "parent", NavItem[]> = {
    student: [{ label: t("nav.games"), href: "/student/games", icon: Gamepad2 }],
    teacher: [],
    parent: [],
  };

  const isUnpaidStudent = session.role === "student" && !Boolean(currentStudentAccess?.hasFullAccess);
  if (isUnpaidStudent) {
    mainNavMap.student = [
      { label: t("nav.student"), href: "/student", icon: LayoutDashboard, exact: true },
      { label: t("tabs.group"), href: "/student/group", icon: UsersRound },
      { label: t("tabs.global"), href: "/student/top", icon: Trophy },
      { label: t("nav.subscription"), href: "/student/subscription", icon: CreditCard },
    ];
    chatNavMap.student = [];
    gamesNavMap.student = [];
  }

  const navItems = mainNavMap[session.role];
  const chatItems = chatNavMap[session.role];
  const gameItems = gamesNavMap[session.role];
  const hasChatItems = chatItems.length > 0;
  const hasGameItems = gameItems.length > 0;

  const mobileQuickNav = useMemo<NavItem[]>(() => {
    if (session.role === "student") {
      const byHref = new Map<string, NavItem>([...navItems, ...chatItems].map((item) => [item.href, item]));
      const preferredOrder = ["/student", "/student/group", "/student/top", "/student/speaking", "/student/games", "/student/ai-chat"];
      return preferredOrder.map((href) => byHref.get(href)).filter((item): item is NavItem => Boolean(item));
    }

    const quick: NavItem[] = [...navItems];
    if (chatItems[0]) {
      quick.push(chatItems[0]);
    }
    if (chatItems[1]) {
      quick.push(chatItems[1]);
    }
    return quick.slice(0, 5);
  }, [chatItems, navItems, session.role]);

  const userName = currentStudent?.fullName ?? currentTeacher?.fullName ?? currentParent?.fullName ?? "User";
  const avatar = currentStudent?.avatarUrl ?? currentTeacher?.avatarUrl ?? currentParent?.avatarUrl;
  const profileHref = session.role === "student" ? "/profile" : session.role === "teacher" ? "/teacher/profile" : "/parent/profile";
  const supportHref = session.role === "student" ? "/student/support" : session.role === "teacher" ? "/teacher/support" : undefined;

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="relative h-dvh overflow-hidden bg-white text-charcoal dark:bg-black dark:text-zinc-100">
      <div className="pointer-events-none absolute inset-0 hidden sm:block bg-[radial-gradient(circle_at_12%_10%,rgba(95,6,6,0.08),transparent_38%),radial-gradient(circle_at_88%_100%,rgba(95,6,6,0.05),transparent_36%)] dark:bg-[radial-gradient(circle_at_10%_8%,rgba(95,6,6,0.2),transparent_34%),radial-gradient(circle_at_90%_100%,rgba(95,6,6,0.16),transparent_40%)]" />

      <div className="relative grid h-full w-full lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="scrollbar-thin hidden border-r border-zinc-200/80 bg-white/90 px-5 py-6 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/92 lg:block lg:h-dvh lg:overflow-y-auto">
          <Link to={session.role === "student" ? "/student" : session.role === "teacher" ? "/teacher" : "/parent"}>
            <BrandLogo
              title={t("app.name")}
              subtitle={t("app.center")}
              size="md"
              className="w-full"
              titleClassName="text-xl text-charcoal dark:text-white"
              subtitleClassName="font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400"
            />
          </Link>

          <div className="mt-6 rounded-3xl border border-burgundy-500/70 bg-gradient-to-br from-burgundy-600 via-burgundy-700 to-burgundy-900 p-4 text-white shadow-lift">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">{t("app.workspace")}</p>
            <p className="mt-1 text-lg font-semibold">
              {session.role === "teacher" ? t("role.teacher") : session.role === "parent" ? t("nav.parent") : t("role.student")}
            </p>
            <p className="mt-1 text-xs text-white/80">{t("app.workspaceDescription")}</p>
          </div>

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">{t("menu.navigation")}</p>
          <nav className="mt-2 space-y-2">
            {navItems.map((item) => {
              const active = isItemActive(location.pathname, item);
              return (
                <Link
                  key={`desktop-main-${item.href}`}
                  to={item.href}
                  className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300", navItemClass(active))}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {hasChatItems ? (
            <>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">{t("menu.chats")}</p>
              <nav className="mt-2 space-y-2">
                {chatItems.map((item) => {
                  const active = isItemActive(location.pathname, item);
                  return (
                    <Link
                      key={`desktop-chat-${item.href}`}
                      to={item.href}
                      className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300", navItemClass(active))}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </>
          ) : null}

          {hasGameItems ? (
            <>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">{t("menu.games")}</p>
              <nav className="mt-2 space-y-2">
                {gameItems.map((item) => {
                  const active = isItemActive(location.pathname, item);
                  return (
                    <Link
                      key={`desktop-game-${item.href}`}
                      to={item.href}
                      className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300", navItemClass(active))}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </>
          ) : null}

          <div className="relative mt-6 overflow-hidden rounded-2xl bg-zinc-100/90 p-4 ring-1 ring-zinc-300/70 dark:bg-zinc-900/80 dark:ring-zinc-700">
            <span className="absolute right-3 top-3 rounded-full bg-zinc-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
              Soon
            </span>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Study</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              Скоро добавим. Скоро сайт будет приложением.
            </p>
          </div>
        </aside>

        <div className="relative flex h-dvh min-w-0 flex-col">
          <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/88 shadow-sm backdrop-blur-xl sm:bg-white/84 dark:border-zinc-800 dark:bg-zinc-950/92 sm:dark:bg-zinc-950/88">
            <div className="mx-auto flex min-h-14 w-full max-w-[1320px] items-center justify-between gap-2 px-2 py-[max(0.45rem,env(safe-area-inset-top))] sm:min-h-16 sm:px-6 lg:py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  to={session.role === "student" ? "/student" : session.role === "teacher" ? "/teacher" : "/parent"}
                  className="inline-flex items-center gap-2"
                >
                  <GraduationCap className="h-5 w-5 text-burgundy-700 dark:text-white" />
                  <span className="max-w-[11rem] truncate text-xs font-semibold text-charcoal/75 dark:text-zinc-200 sm:max-w-none sm:text-sm">
                    {t("header.dashboard")}
                  </span>
                </Link>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <div className="sm:hidden">
                  <LanguageSwitcher compact mode="single" />
                </div>
                <div className="hidden sm:block">
                  <LanguageSwitcher compact mode="single" />
                </div>
                <ThemeToggle compact />
                <UserMenu fullName={userName} avatarUrl={avatar} profileHref={profileHref} supportHref={supportHref} onLogout={logout} />
              </div>
            </div>
          </header>

          <div
            ref={contentScrollRef}
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-[calc(5.7rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-6 sm:pt-6"
          >
            <div className="mx-auto w-full max-w-[1320px]">
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={`${location.pathname}${location.search}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  style={{ willChange: "transform, opacity" }}
                >
                  {session.role === "student" ? (
                    <div className="mb-4 inline-flex w-full flex-wrap items-center gap-2 rounded-2xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-sm font-semibold text-burgundy-800 dark:border-burgundy-800 dark:bg-burgundy-900/35 dark:text-burgundy-100">
                      <Trophy className="h-4 w-4 text-burgundy-700 dark:text-white" />
                      <span>{t("promo.top5WeeklyFree")}</span>
                    </div>
                  ) : null}
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-2 bottom-[max(0.35rem,env(safe-area-inset-bottom))] z-[65] rounded-[1.35rem] border border-zinc-200/80 bg-white/90 p-1.5 shadow-lift backdrop-blur-xl lg:hidden dark:border-zinc-800 dark:bg-zinc-950/94">
        <div className="[-ms-overflow-style:none] flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mobileQuickNav.map((item) => {
            const active = isItemActive(location.pathname, item);
            return (
              <Link
                key={`mobile-bottom-${item.href}`}
                to={item.href}
                className={cn(
                  "flex min-h-[4rem] min-w-[4.75rem] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-[1rem] px-2 py-2 text-[10px] font-semibold transition sm:min-h-[4.25rem]",
                  active
                    ? "bg-gradient-to-br from-burgundy-600 to-burgundy-800 text-white shadow-soft"
                    : "text-charcoal/70 dark:text-zinc-300",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0 sm:h-[1.15rem] sm:w-[1.15rem]" />
                <span className="max-w-full truncate text-center leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
