import { Bot, GraduationCap, LayoutDashboard, Menu, MessageCircle, Trophy, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";
import { UserMenu } from "../components/UserMenu";
import { Button } from "../components/ui/button";
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

export function AppLayout() {
  const location = useLocation();
  const { state, currentStudent, currentTeacher, logout } = useAppStore();
  const { t } = useUi();
  const session = state.session;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  if (!session) {
    return null;
  }

  const navMap: Record<"student" | "teacher", NavItem[]> = {
    student: [
      { label: t("nav.student"), href: "/student", icon: LayoutDashboard, exact: true },
      { label: t("tabs.group"), href: "/student/group", icon: UsersRound },
      { label: t("tabs.global"), href: "/student/top", icon: Trophy },
      { label: t("nav.friendly"), href: "/student/chat", icon: MessageCircle },
      { label: t("nav.aiChat"), href: "/student/ai-chat", icon: Bot },
    ],
    teacher: [
      { label: t("nav.teacher"), href: "/teacher", icon: LayoutDashboard, exact: true },
      { label: t("nav.teacherGroups"), href: "/teacher/groups", icon: UsersRound },
      { label: t("nav.teacherTop"), href: "/teacher/top", icon: Trophy },
      { label: t("nav.friendly"), href: "/teacher/chat", icon: MessageCircle },
      { label: t("nav.aiChat"), href: "/teacher/ai-chat", icon: Bot },
    ],
  };

  const navItems = navMap[session.role];
  const userName = currentStudent?.fullName ?? currentTeacher?.fullName ?? "User";
  const avatar = currentStudent?.avatarUrl ?? currentTeacher?.avatarUrl;
  const profileHref = session.role === "student" ? "/profile" : "/teacher/profile";

  return (
    <div className="h-dvh overflow-hidden bg-[#f5f5f7] text-charcoal dark:bg-black dark:text-zinc-100">
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t("menu.close")}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="relative z-10 h-full w-[86vw] max-w-[340px] overflow-y-auto border-r border-burgundy-100 bg-white px-4 pb-5 pt-4 shadow-lift dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-2">
              <Link to={session.role === "student" ? "/student" : "/teacher"}>
                <BrandLogo
                  title={t("app.name")}
                  subtitle={t("app.center")}
                  size="sm"
                  className="max-w-[220px]"
                  titleClassName="text-base text-charcoal dark:text-white"
                />
              </Link>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                aria-label={t("menu.close")}
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 rounded-2xl border border-burgundy-100 bg-gradient-to-br from-burgundy-700 to-burgundy-900 p-4 text-white dark:border-burgundy-800">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">{t("app.workspace")}</p>
              <p className="mt-1 text-base font-semibold">{session.role === "teacher" ? t("role.teacher") : t("role.student")}</p>
              <p className="mt-1 text-xs text-white/75">{t("app.workspaceDescription")}</p>
            </div>

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">{t("menu.navigation")}</p>
            <nav className="mt-2 space-y-2">
              {navItems.map((item) => {
                const active = isItemActive(location.pathname, item);
                return (
                  <Link
                    key={`mobile-${item.label}`}
                    to={item.href}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-burgundy-700 text-white shadow-soft"
                        : "text-charcoal/70 hover:bg-burgundy-50 hover:text-burgundy-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}

      <div className="grid h-full w-full lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="hidden border-r border-burgundy-100/80 bg-white px-5 py-6 dark:border-zinc-800 dark:bg-zinc-950 lg:block lg:h-dvh lg:overflow-y-auto">
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

          <div className="mt-6 rounded-2xl border border-burgundy-100 bg-gradient-to-br from-burgundy-700 to-burgundy-900 p-4 text-white dark:border-burgundy-800">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/75">{t("app.workspace")}</p>
            <p className="mt-1 text-lg font-semibold">{session.role === "teacher" ? t("role.teacher") : t("role.student")}</p>
            <p className="mt-1 text-xs text-white/75">{t("app.workspaceDescription")}</p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const active = isItemActive(location.pathname, item);
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-burgundy-700 text-white shadow-soft"
                      : "text-charcoal/70 hover:bg-burgundy-50 hover:text-burgundy-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="relative flex h-dvh min-w-0 flex-col">
          <header className="sticky top-0 z-40 border-b border-burgundy-100/70 bg-white/95 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
            <div className="mx-auto flex min-h-16 w-full max-w-[1320px] items-center justify-between gap-2 px-3 py-[max(0.5rem,env(safe-area-inset-top))] sm:px-6 lg:py-2">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 lg:hidden"
                  aria-label={t("menu.open")}
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>

                <Link to={session.role === "student" ? "/student" : "/teacher"} className="inline-flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-burgundy-700 dark:text-burgundy-300" />
                  <span className="max-w-[11rem] truncate text-xs font-semibold text-charcoal/70 dark:text-zinc-200 sm:max-w-none sm:text-sm">
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

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6 sm:pt-6">
            <div className="mx-auto w-full max-w-[1320px]">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
