import { Gamepad2, GraduationCap, LayoutDashboard, Menu, MessageCircle, Mic, ShieldCheck, Trophy, UsersRound, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
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
  locked?: boolean;
}

const ONLY_SUPPORT_AND_RATINGS_ENABLED = true;
const FULL_ACCESS_STUDENT_PHONES = new Set(["998978778177"]);
const ADMIN_PHONES = new Set(["998978778177"]);

function normalizePhone(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function isFullAccessStudent(phone: string | undefined): boolean {
  return FULL_ACCESS_STUDENT_PHONES.has(normalizePhone(phone));
}

function isAdminPhone(phone: string | undefined): boolean {
  return ADMIN_PHONES.has(normalizePhone(phone));
}

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.locked) return false;
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function navItemClass(active: boolean, locked = false): string {
  if (locked) {
    return "cursor-not-allowed text-charcoal/40 dark:text-zinc-600";
  }
  if (active) {
    return "bg-gradient-to-br from-burgundy-600 via-burgundy-700 to-burgundy-800 text-white shadow-soft";
  }
  return "text-charcoal/75 hover:bg-burgundy-50/80 hover:text-charcoal dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white";
}

function soonBadgeClass(): string {
  return "ml-auto rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
}

export function AppLayout() {
  const location = useLocation();
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { state, currentStudent, currentTeacher, currentParent, logout } = useAppStore();
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

  const fullAccessStudent = session.role === "student" && isFullAccessStudent(currentStudent?.phone);
  const adminPhone = currentStudent?.phone ?? currentTeacher?.phone ?? currentParent?.phone;
  const hasAdminAccess = isAdminPhone(adminPhone);
  if (ONLY_SUPPORT_AND_RATINGS_ENABLED && session.role === "student" && !fullAccessStudent) {
    mainNavMap.student = [
      { label: t("nav.student"), href: "/student", icon: LayoutDashboard, exact: true },
      { label: t("tabs.group"), href: "/student/group", icon: UsersRound },
      { label: t("tabs.global"), href: "/student/top", icon: Trophy },
      { label: t("nav.speaking"), href: "/student/speaking", icon: Mic, locked: true },
    ];
    chatNavMap.student = [
      { label: t("nav.friendly"), href: "/student/chat", icon: MessageCircle, locked: true },
      { label: t("nav.aiChat"), href: "/student/ai-chat", icon: MessageCircle, locked: true },
    ];
    gamesNavMap.student = [{ label: t("nav.games"), href: "/student/games", icon: Gamepad2, locked: true }];
  }

  const navItems = mainNavMap[session.role];
  const chatItems = chatNavMap[session.role];
  const gameItems = gamesNavMap[session.role];
  const hasChatItems = chatItems.length > 0;
  const hasGameItems = gameItems.length > 0;
  const adminItems = useMemo<NavItem[]>(
    () => (hasAdminAccess ? [{ label: "Admin", href: "/admin", icon: ShieldCheck, exact: true }] : []),
    [hasAdminAccess],
  );

  const mobileQuickNav = useMemo<NavItem[]>(() => {
    if (session.role === "student") {
      const byHref = new Map<string, NavItem>([...navItems, ...chatItems, ...gameItems].map((item) => [item.href, item]));
      const preferredOrder = ["/student", "/student/group", "/student/top", "/student/speaking", "/student/games", "/student/ai-chat"];
      return [...preferredOrder.map((href) => byHref.get(href)).filter((item): item is NavItem => Boolean(item)), ...adminItems].slice(0, 7);
    }

    const quick: NavItem[] = [...navItems];
    if (chatItems[0]) {
      quick.push(chatItems[0]);
    }
    if (chatItems[1]) {
      quick.push(chatItems[1]);
    }
    return [...quick, ...adminItems].slice(0, 7);
  }, [adminItems, chatItems, gameItems, navItems, session.role]);

  const userName = currentStudent?.fullName ?? currentTeacher?.fullName ?? currentParent?.fullName ?? "User";
  const avatar = currentStudent?.avatarUrl ?? currentTeacher?.avatarUrl ?? currentParent?.avatarUrl;
  const openHomeHref =
    ONLY_SUPPORT_AND_RATINGS_ENABLED && session.role === "student" && !fullAccessStudent
      ? session.role === "student"
        ? "/student/top"
        : session.role === "teacher"
          ? "/teacher/top"
          : "/top"
      : session.role === "student"
        ? "/student"
        : session.role === "teacher"
          ? "/teacher"
          : "/parent";
  const profileHref = session.role === "student"
      ? "/profile"
      : session.role === "teacher"
        ? "/teacher/profile"
        : "/parent/profile";
  const supportHref = session.role === "student" ? "/student/support" : session.role === "teacher" ? "/teacher/support" : undefined;

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative h-dvh overflow-hidden bg-white text-charcoal dark:bg-black dark:text-zinc-100">
      <div className="pointer-events-none absolute inset-0 hidden sm:block bg-[radial-gradient(circle_at_12%_10%,rgba(95,6,6,0.08),transparent_38%),radial-gradient(circle_at_88%_100%,rgba(95,6,6,0.05),transparent_36%)] dark:bg-[radial-gradient(circle_at_10%_8%,rgba(95,6,6,0.2),transparent_34%),radial-gradient(circle_at_90%_100%,rgba(95,6,6,0.16),transparent_40%)]" />
      <div className="relative grid h-full w-full lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="scrollbar-thin hidden border-r border-zinc-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/92 lg:block lg:h-dvh lg:overflow-y-auto">
          <Link to={openHomeHref}>
            <BrandLogo
              title={t("app.name")}
              subtitle={t("app.center")}
              size="md"
              className="w-full"
              titleClassName="text-xl text-charcoal dark:text-white"
              subtitleClassName="font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400"
            />
          </Link>

          <div className="mt-4 rounded-2xl border border-burgundy-500/70 bg-gradient-to-br from-burgundy-600 via-burgundy-700 to-burgundy-900 p-3.5 text-white shadow-lift">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">{t("app.workspace")}</p>
            <p className="mt-1 text-base font-semibold">
              {session.role === "teacher" ? t("role.teacher") : session.role === "parent" ? t("nav.parent") : t("role.student")}
            </p>
            <p className="mt-1 text-xs text-white/80">{t("app.workspaceDescription")}</p>
          </div>

          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">{t("menu.navigation")}</p>
          <nav className="mt-2 space-y-2">
            {navItems.map((item) => {
              const active = isItemActive(location.pathname, item);
              const className = cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300", navItemClass(active, item.locked));
              const content = (
                <>
                  <item.icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                  {item.locked ? <span className={soonBadgeClass()}>Soon</span> : null}
                </>
              );
              return item.locked ? (
                <span key={`desktop-main-${item.href}`} className={className} aria-disabled="true">
                  {content}
                </span>
              ) : (
                <Link key={`desktop-main-${item.href}`} to={item.href} className={className}>
                  {content}
                </Link>
              );
            })}
          </nav>

          {adminItems.length > 0 ? (
            <>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">Admin</p>
              <nav className="mt-2 space-y-2">
                {adminItems.map((item) => {
                  const active = isItemActive(location.pathname, item);
                  const className = cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300", navItemClass(active));
                  return (
                    <Link key={`desktop-admin-${item.href}`} to={item.href} className={className}>
                      <item.icon className="h-4 w-4" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </>
          ) : null}

          {hasChatItems ? (
            <>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">{t("menu.chats")}</p>
              <nav className="mt-2 space-y-2">
                {chatItems.map((item) => {
                  const active = isItemActive(location.pathname, item);
                  const className = cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300", navItemClass(active, item.locked));
                  const content = (
                    <>
                      <item.icon className="h-4 w-4" />
                      <span className="truncate">{item.label}</span>
                      {item.locked ? <span className={soonBadgeClass()}>Soon</span> : null}
                    </>
                  );
                  return item.locked ? (
                    <span key={`desktop-chat-${item.href}`} className={className} aria-disabled="true">
                      {content}
                    </span>
                  ) : (
                    <Link key={`desktop-chat-${item.href}`} to={item.href} className={className}>
                      {content}
                    </Link>
                  );
                })}
              </nav>
            </>
          ) : null}

          {hasGameItems ? (
            <>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">{t("menu.games")}</p>
              <nav className="mt-2 space-y-2">
                {gameItems.map((item) => {
                  const active = isItemActive(location.pathname, item);
                  const className = cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300", navItemClass(active, item.locked));
                  const content = (
                    <>
                      <item.icon className="h-4 w-4" />
                      <span className="truncate">{item.label}</span>
                      {item.locked ? <span className={soonBadgeClass()}>Soon</span> : null}
                    </>
                  );
                  return item.locked ? (
                    <span key={`desktop-game-${item.href}`} className={className} aria-disabled="true">
                      {content}
                    </span>
                  ) : (
                    <Link key={`desktop-game-${item.href}`} to={item.href} className={className}>
                      {content}
                    </Link>
                  );
                })}
              </nav>
            </>
          ) : null}

          <div className="relative mt-4 overflow-hidden rounded-2xl bg-zinc-100/90 p-3 ring-1 ring-zinc-300/70 dark:bg-zinc-900/80 dark:ring-zinc-700">
            <span className="absolute right-3 top-3 rounded-full bg-zinc-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
              Soon
            </span>
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{t("menu.studySoonTitle")}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">{t("menu.studySoonText")}</p>
          </div>
        </aside>

        <div className="relative flex h-dvh min-w-0 flex-col">
          <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/88 shadow-sm backdrop-blur-xl sm:bg-white/84 dark:border-zinc-800 dark:bg-zinc-950/92 sm:dark:bg-zinc-950/88">
            <div className="mx-auto flex min-h-12 w-full max-w-[1320px] items-center justify-between gap-2 px-2 py-[max(0.35rem,env(safe-area-inset-top))] sm:min-h-14 sm:px-5 lg:py-2">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-charcoal lg:hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <Link
                  to={openHomeHref}
                  className="inline-flex items-center gap-2"
                >
                  <GraduationCap className="h-5 w-5 text-burgundy-700 dark:text-white" />
                  <span className="max-w-[11rem] truncate text-[11px] font-semibold text-charcoal/75 dark:text-zinc-200 sm:max-w-none sm:text-sm">
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
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-[calc(4.9rem+env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-5 sm:pt-4"
          >
            <div className="mx-auto w-full max-w-[1320px]">
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={`${location.pathname}${location.search}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  style={{ willChange: "transform, opacity" }}
                >
                  {session.role === "student" ? (
                    <div className="mb-2 inline-flex w-full flex-wrap items-center gap-1.5 rounded-2xl border border-burgundy-200 bg-burgundy-50 px-3 py-1.5 text-xs font-semibold text-burgundy-800 dark:border-burgundy-800 dark:bg-burgundy-900/35 dark:text-burgundy-100">
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

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/45"
            aria-label="Close menu backdrop"
          />
          <aside className="absolute left-0 top-0 h-dvh w-[82vw] max-w-[320px] overflow-y-auto border-r border-zinc-200 bg-white px-4 py-4 shadow-lift dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center justify-between">
              <BrandLogo
                title={t("app.name")}
                subtitle={t("app.center")}
                size="sm"
                titleClassName="text-base text-charcoal dark:text-white"
                subtitleClassName="text-[10px] uppercase tracking-[0.08em] text-charcoal/50 dark:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="space-y-2">
              {mobileQuickNav.map((item) => {
                const active = isItemActive(location.pathname, item);
                const className = cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold", navItemClass(active, item.locked));
                const content = (
                  <>
                    <item.icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                    {item.locked ? <span className={soonBadgeClass()}>Soon</span> : null}
                  </>
                );
                return item.locked ? (
                  <span key={`mobile-drawer-${item.href}`} className={className} aria-disabled="true">
                    {content}
                  </span>
                ) : (
                  <Link key={`mobile-drawer-${item.href}`} to={item.href} className={className}>
                    {content}
                  </Link>
                );
              })}
            </nav>

            {adminItems.length > 0 ? (
              <>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">Admin</p>
                <nav className="mt-2 space-y-2">
                  {adminItems.map((item) => {
                    const active = isItemActive(location.pathname, item);
                    const className = cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold", navItemClass(active));
                    return (
                      <Link key={`mobile-admin-${item.href}`} to={item.href} className={className}>
                        <item.icon className="h-4 w-4" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </>
            ) : null}

            {hasChatItems ? (
              <>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">{t("menu.chats")}</p>
                <nav className="mt-2 space-y-2">
                  {chatItems.map((item) => {
                    const active = isItemActive(location.pathname, item);
                    const className = cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold", navItemClass(active, item.locked));
                    const content = (
                      <>
                        <item.icon className="h-4 w-4" />
                        <span className="truncate">{item.label}</span>
                        {item.locked ? <span className={soonBadgeClass()}>Soon</span> : null}
                      </>
                    );
                    return item.locked ? (
                      <span key={`mobile-chat-${item.href}`} className={className} aria-disabled="true">
                        {content}
                      </span>
                    ) : (
                      <Link key={`mobile-chat-${item.href}`} to={item.href} className={className}>
                        {content}
                      </Link>
                    );
                  })}
                </nav>
              </>
            ) : null}

            {hasGameItems ? (
              <>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">{t("menu.games")}</p>
                <nav className="mt-2 space-y-2">
                  {gameItems.map((item) => {
                    const active = isItemActive(location.pathname, item);
                    const className = cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold", navItemClass(active, item.locked));
                    const content = (
                      <>
                        <item.icon className="h-4 w-4" />
                        <span className="truncate">{item.label}</span>
                        {item.locked ? <span className={soonBadgeClass()}>Soon</span> : null}
                      </>
                    );
                    return item.locked ? (
                      <span key={`mobile-game-${item.href}`} className={className} aria-disabled="true">
                        {content}
                      </span>
                    ) : (
                      <Link key={`mobile-game-${item.href}`} to={item.href} className={className}>
                        {content}
                      </Link>
                    );
                  })}
                </nav>
              </>
            ) : null}

          </aside>
        </div>
      ) : null}
    </div>
  );
}
