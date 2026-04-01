import { GraduationCap, LayoutDashboard, Trophy, UsersRound } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
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

export function AppLayout() {
  const location = useLocation();
  const { state, currentStudent, currentTeacher, logout } = useAppStore();
  const { t } = useUi();
  const session = state.session;

  if (!session) {
    return null;
  }

  const navMap: Record<"student" | "teacher", NavItem[]> = {
    student: [
      { label: t("nav.student"), href: "/student", icon: LayoutDashboard, exact: true },
      { label: t("tabs.group"), href: "/student/group", icon: UsersRound },
      { label: t("tabs.global"), href: "/student/top", icon: Trophy },
    ],
    teacher: [
      { label: t("nav.teacher"), href: "/teacher", icon: LayoutDashboard, exact: true },
    ],
  };

  const navItems = navMap[session.role];
  const userName = currentStudent?.fullName ?? currentTeacher?.fullName ?? "User";
  const avatar = currentStudent?.avatarUrl ?? currentTeacher?.avatarUrl;
  const profileHref = session.role === "student" ? "/profile" : "/teacher/profile";

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-charcoal dark:bg-[#0b0b0d] dark:text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-[1700px] lg:grid-cols-[290px_1fr]">
        <aside className="hidden border-r border-burgundy-100/80 bg-white px-5 py-6 dark:border-zinc-800 dark:bg-zinc-950 lg:block">
          <Link to={session.role === "student" ? "/student" : "/teacher"} className="inline-flex items-center gap-3">
            <span className="grid h-12 w-12 place-content-center rounded-2xl bg-burgundy-700 text-sm font-bold tracking-[0.16em] text-white shadow-soft">
              R
            </span>
            <div>
              <p className="font-display text-3xl text-burgundy-800 dark:text-burgundy-300">{t("app.name")}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("app.center")}</p>
            </div>
          </Link>

          <div className="mt-6 rounded-2xl border border-burgundy-100 bg-gradient-to-br from-burgundy-700 to-burgundy-900 p-4 text-white">
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

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-burgundy-100/70 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
              <Link to={session.role === "student" ? "/student" : "/teacher"} className="inline-flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-burgundy-700 dark:text-burgundy-300" />
                <span className="text-sm font-semibold text-charcoal/70 dark:text-zinc-200">{t("header.dashboard")}</span>
              </Link>

              <div className="flex items-center gap-2">
                <LanguageSwitcher compact />
                <ThemeToggle compact />
                <UserMenu fullName={userName} avatarUrl={avatar} profileHref={profileHref} onLogout={logout} />
              </div>
            </div>

            <nav className="overflow-x-auto border-t border-burgundy-100/70 px-3 py-2 dark:border-zinc-800 lg:hidden">
              <div className="flex min-w-max items-center gap-2">
                {navItems.map((item) => {
                  const active = isItemActive(location.pathname, item);
                  return (
                    <Link
                      key={`mobile-${item.label}`}
                      to={item.href}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
                        active
                          ? "bg-burgundy-700 text-white"
                          : "bg-white text-charcoal/70 hover:bg-burgundy-50 hover:text-burgundy-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </header>

          <div className="flex-1 p-4 sm:p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
