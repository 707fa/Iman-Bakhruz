import { BarChart3, CreditCard, Gamepad2, GraduationCap, LayoutDashboard, MessageCircle, Mic, Trophy, UsersRound } from "lucide-react";
import { useMemo } from "react";
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
    return "bg-burgundy-700 text-white shadow-soft";
  }
  return "text-charcoal/75 hover:bg-zinc-100 hover:text-charcoal dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white";
}

export function AppLayout() {
  const location = useLocation();
  const { state, currentStudent, currentStudentAccess, currentTeacher, logout } = useAppStore();
  const { t } = useUi();
  const session = state.session;

  if (!session) {
    return null;
  }

  const mainNavMap: Record<"student" | "teacher", NavItem[]> = {
    student: [
      { label: t("nav.student"), href: "/student", icon: LayoutDashboard, exact: true },
      { label: t("tabs.group"), href: "/student/group", icon: UsersRound },
      { label: t("tabs.global"), href: "/student/top", icon: Trophy },
      { label: t("nav.speaking"), href: "/student/speaking", icon: Mic },
      { label: t("nav.parent"), href: "/student/parent", icon: BarChart3 },
    ],
    teacher: [
      { label: t("nav.teacher"), href: "/teacher", icon: LayoutDashboard, exact: true },
      { label: t("nav.teacherGroups"), href: "/teacher/groups", icon: UsersRound },
      { label: t("nav.teacherTop"), href: "/teacher/top", icon: Trophy },
    ],
  };

  const chatNavMap: Record<"student" | "teacher", NavItem[]> = {
    student: [
      { label: t("nav.friendly"), href: "/student/chat", icon: MessageCircle },
      { label: t("nav.aiChat"), href: "/student/ai-chat", icon: MessageCircle },
    ],
    teacher: [
      { label: t("nav.friendly"), href: "/teacher/chat", icon: MessageCircle },
    ],
  };

  const gamesNavMap: Record<"student" | "teacher", NavItem[]> = {
    student: [{ label: t("nav.games"), href: "/student/games", icon: Gamepad2 }],
    teacher: [],
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
      const preferredOrder = ["/student/group", "/student/top", "/student/speaking", "/student/parent", "/student/chat"];
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

  const userName = currentStudent?.fullName ?? currentTeacher?.fullName ?? "User";
  const avatar = currentStudent?.avatarUrl ?? currentTeacher?.avatarUrl;
  const profileHref = session.role === "student" ? "/profile" : "/teacher/profile";

  return (
    <div className="relative h-dvh overflow-hidden bg-white text-charcoal dark:bg-black dark:text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(128,0,32,0.06),transparent_38%),radial-gradient(circle_at_88%_100%,rgba(128,0,32,0.04),transparent_36%)] dark:bg-[radial-gradient(circle_at_10%_8%,rgba(128,0,32,0.16),transparent_34%),radial-gradient(circle_at_90%_100%,rgba(128,0,32,0.12),transparent_40%)]" />

      <div className="relative grid h-full w-full lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="scrollbar-thin hidden border-r border-burgundy-100/80 bg-white/95 px-5 py-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95 lg:block lg:h-dvh lg:overflow-y-auto">
          <Link to={session.role === "student" ? "/student" : "/teacher"}>
            <BrandLogo
              title={t("app.name")}
              subtitle={t("app.center")}
              size="md"
              className="w-full"
              titleClassName="text-xl text-charcoal dark:text-white"
              subtitleClassName="font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400"
            />
          </Link>

          <div className="mt-6 rounded-2xl border border-burgundy-200 bg-burgundy-700 p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">{t("app.workspace")}</p>
            <p className="mt-1 text-lg font-semibold">{session.role === "teacher" ? t("role.teacher") : t("role.student")}</p>
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
                  className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition", navItemClass(active))}
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
                      className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition", navItemClass(active))}
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
                      className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition", navItemClass(active))}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </>
          ) : null}
        </aside>

        <div className="relative flex h-dvh min-w-0 flex-col">
          <header className="sticky top-0 z-40 border-b border-burgundy-100/70 bg-white/92 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/92">
            <div className="mx-auto flex min-h-14 w-full max-w-[1320px] items-center justify-between gap-2 px-2 py-[max(0.45rem,env(safe-area-inset-top))] sm:min-h-16 sm:px-6 lg:py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Link to={session.role === "student" ? "/student" : "/teacher"} className="inline-flex items-center gap-2">
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
                  <LanguageSwitcher compact />
                </div>
                <ThemeToggle compact />
                <UserMenu fullName={userName} avatarUrl={avatar} profileHref={profileHref} onLogout={logout} />
              </div>
            </div>
          </header>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-6 sm:pt-6">
            <div className="mx-auto w-full max-w-[1320px]">
              <div className="mb-4 inline-flex w-full flex-wrap items-center gap-2 rounded-2xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-sm font-semibold text-burgundy-800 dark:border-burgundy-800 dark:bg-burgundy-900/35 dark:text-burgundy-100">
                <Trophy className="h-4 w-4 text-burgundy-700 dark:text-white" />
                <span>{t("promo.top5WeeklyFree")}</span>
              </div>
              <Outlet />
            </div>
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-2 bottom-[max(0.4rem,env(safe-area-inset-bottom))] z-[65] rounded-2xl border border-burgundy-100 bg-white/95 p-1.5 shadow-lift backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(mobileQuickNav.length, 1)}, minmax(0, 1fr))` }}
        >
          {mobileQuickNav.map((item) => {
            const active = isItemActive(location.pathname, item);
            return (
              <Link
                key={`mobile-bottom-${item.href}`}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition",
                  active ? "bg-burgundy-700 text-white" : "text-charcoal/70 dark:text-zinc-300",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
