import { GraduationCap, Lock, LogIn, ShieldCheck, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { RankingList } from "../components/RankingList";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { getGlobalTop } from "../lib/ranking";

function maskName(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Student";

  const first = words[0];
  const second = words[1];
  const firstMasked = first.length <= 2 ? first : `${first.slice(0, 2)}***`;
  if (!second) return firstMasked;
  return `${firstMasked} ${second[0]}.`;
}

export function PublicTopPage() {
  const { state } = useAppStore();
  const { t } = useUi();

  const top = getGlobalTop(state, 20).map((item) => ({
    ...item,
    fullName: maskName(item.fullName),
    groupId: "",
  }));

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-black">
      <div className="mx-auto max-w-5xl p-4 pb-10 sm:p-6">
        <header className="sticky top-2 z-30 rounded-2xl border border-burgundy-100/80 bg-white/95 px-3 py-2 shadow-soft backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-4">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <BrandLogo
              title={t("app.name")}
              subtitle={t("app.center")}
              size="sm"
              className="max-w-[11.5rem] sm:max-w-none"
              titleClassName="text-base text-burgundy-800 dark:text-zinc-100 sm:text-lg"
              subtitleClassName="hidden sm:block"
            />
            <div className="flex shrink-0 items-center gap-2">
              <LanguageSwitcher compact />
              <ThemeToggle compact />
            </div>
          </div>
        </header>

        <main className="mt-6 space-y-5">
          <Card className="overflow-hidden">
            <CardContent className="space-y-3 bg-gradient-to-r from-burgundy-900 to-burgundy-700 p-5 text-white sm:p-6">
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
                <Trophy className="h-3.5 w-3.5" />
                {t("public.badge")}
              </p>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{t("public.title")}</h1>
              <p className="max-w-2xl text-sm text-white/85 sm:text-base">{t("public.subtitle")}</p>
              <p className="inline-flex items-start gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white/90 sm:text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                {t("public.privacy")}
              </p>
            </CardContent>
          </Card>

          <RankingList title={t("public.topList")} items={top} showMeta={false} />

          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <p className="inline-flex items-center gap-2 text-sm text-charcoal/70 dark:text-zinc-300">
                <Lock className="h-4 w-4 text-burgundy-700 dark:text-burgundy-300" />
                {t("public.privateAccess")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link to="/login">
                  <Button>
                    <LogIn className="mr-2 h-4 w-4" />
                    {t("auth.loginButton")}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="secondary">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    {t("auth.registerLink")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

