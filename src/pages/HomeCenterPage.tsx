import { ArrowRight, BadgeCheck, GraduationCap, Instagram, PhoneCall, Send, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import teacherPhoto from "../assets/Iman-behruz.jpg";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";

const TELEGRAM_URL = "https://t.me/iman_bekhruz";
const INSTAGRAM_URL = "https://instagram.com/iman.bekhruz";
const DEFAULT_PHONE = "+998 90 978-82-55";

function roleHome(role: "student" | "teacher" | "parent"): string {
  if (role === "teacher") return "/teacher";
  if (role === "parent") return "/parent";
  return "/student";
}

export function HomeCenterPage() {
  const { state } = useAppStore();
  const { t } = useUi();

  const teacher = state.teachers[0];
  const displayPhone = teacher?.phone || DEFAULT_PHONE;
  const teacherName = "Iman Bekhruz";
  const dashboardHref = state.session ? roleHome(state.session.role) : "/login";

  return (
    <div className="min-h-screen bg-white text-charcoal dark:bg-black dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-6 sm:pb-10">
        <header className="sticky top-2 z-30 rounded-2xl border border-burgundy-100/80 bg-white/95 px-3 py-2 shadow-soft backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-4">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <BrandLogo
              title={t("app.name")}
              subtitle={t("app.center")}
              size="sm"
              className="max-w-[13rem] sm:max-w-none"
              titleClassName="text-base text-charcoal dark:text-zinc-100 sm:text-lg"
              subtitleClassName="hidden sm:block"
            />

            <div className="flex shrink-0 items-center gap-2">
              <LanguageSwitcher compact mode="single" />
              <ThemeToggle compact />
              <Link to={dashboardHref} className="hidden sm:block">
                <Button size="sm">
                  <GraduationCap className="mr-1.5 h-4 w-4" />
                  {state.session ? t("landing.openDashboard") : t("auth.loginButton")}
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="mt-6 space-y-5">
          <Card className="overflow-hidden border-burgundy-200/80 shadow-lift">
            <CardContent className="p-0">
              <div className="grid gap-5 bg-gradient-to-br from-burgundy-900 via-burgundy-800 to-burgundy-700 p-5 text-white sm:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div className="space-y-4">
                  <Badge className="w-fit border-white/20 bg-white/10 text-white">{t("landing.badge")}</Badge>
                  <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{t("landing.title")}</h1>
                  <p className="max-w-xl text-sm text-white/85 sm:text-base">{t("landing.subtitle")}</p>
                  <p className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white/95 sm:text-sm">
                    <Sparkles className="h-4 w-4" />
                    {t("promo.top5WeeklyFree")}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Link to="/login">
                      <Button variant="secondary">
                        {t("auth.loginButton")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/register">
                      <Button variant="positive">{t("auth.registerLink")}</Button>
                    </Link>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/20 bg-black/20 p-4 backdrop-blur sm:p-5">
                  <img src={teacherPhoto} alt={t("landing.teacherPhotoAlt")} className="h-60 w-full rounded-2xl object-cover sm:h-72" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardContent className="space-y-4 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("landing.teacherInfo")}</p>
                <h2 className="text-2xl font-bold text-charcoal dark:text-zinc-100">{teacherName}</h2>
                <p className="text-sm text-charcoal/75 dark:text-zinc-300">{t("landing.teacherDescription")}</p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-burgundy-100 bg-burgundy-50/60 px-3 py-2 text-sm dark:border-burgundy-900/40 dark:bg-burgundy-900/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">{t("landing.experience")}</p>
                    <p className="mt-1 font-semibold text-burgundy-700 dark:text-white">5+ {t("landing.years")}</p>
                  </div>
                  <div className="rounded-2xl border border-burgundy-100 bg-burgundy-50/60 px-3 py-2 text-sm dark:border-burgundy-900/40 dark:bg-burgundy-900/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">{t("landing.students")}</p>
                    <p className="mt-1 font-semibold text-burgundy-700 dark:text-white">120+</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("landing.contactsTitle")}</p>
                <a
                  href={`tel:${displayPhone.replace(/\s|-/g, "")}`}
                  className="flex items-center justify-between rounded-2xl border border-burgundy-100 bg-white px-3 py-3 text-sm font-semibold transition hover:border-burgundy-300 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <span className="inline-flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-burgundy-700 dark:text-white" />
                    {t("landing.phone")}
                  </span>
                  <span className="text-burgundy-700 dark:text-white">{displayPhone}</span>
                </a>

                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-burgundy-100 bg-white px-3 py-3 text-sm font-semibold transition hover:border-burgundy-300 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <span className="inline-flex items-center gap-2">
                    <Send className="h-4 w-4 text-burgundy-700 dark:text-white" />
                    Telegram
                  </span>
                  <span className="text-burgundy-700 dark:text-white">@iman_bekhruz</span>
                </a>

                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-burgundy-100 bg-white px-3 py-3 text-sm font-semibold transition hover:border-burgundy-300 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <span className="inline-flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-burgundy-700 dark:text-white" />
                    Instagram
                  </span>
                  <span className="text-burgundy-700 dark:text-white">@iman.bekhruz</span>
                </a>

                <div className="rounded-2xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-xs font-semibold text-burgundy-800 dark:border-burgundy-800 dark:bg-burgundy-900/35 dark:text-burgundy-100">
                  {t("landing.contactNote")}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
              <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-zinc-100">
                  <BadgeCheck className="h-4 w-4 text-burgundy-700 dark:text-white" />
                  {t("landing.feature1Title")}
                </p>
                <p className="mt-2 text-sm text-charcoal/75 dark:text-zinc-300">{t("landing.feature1Text")}</p>
              </div>
              <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-zinc-100">
                  <BadgeCheck className="h-4 w-4 text-burgundy-700 dark:text-white" />
                  {t("landing.feature2Title")}
                </p>
                <p className="mt-2 text-sm text-charcoal/75 dark:text-zinc-300">{t("landing.feature2Text")}</p>
              </div>
              <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-zinc-100">
                  <BadgeCheck className="h-4 w-4 text-burgundy-700 dark:text-white" />
                  {t("landing.feature3Title")}
                </p>
                <p className="mt-2 text-sm text-charcoal/75 dark:text-zinc-300">{t("landing.feature3Text")}</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
