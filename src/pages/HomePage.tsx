import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Instagram,
  PhoneCall,
  Send,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
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

const TELEGRAM_URL = "https://t.me/iman_bakhruz";
const INSTAGRAM_URL = "https://instagram.com/iman.bakhruz";
const DEFAULT_PHONE = "+998 90 978-82-55";

const teacherStoryKeys = [
  "landing.story1",
  "landing.story2",
  "landing.story3",
  "landing.story4",
  "landing.story5",
];

const teacherSlides = [
  {
    src: teacherPhoto,
    alt: "Iman Bakhruz teacher portrait",
    labelKey: "landing.slide1",
    position: "50% 18%",
  },
  {
    src: teacherPhoto,
    alt: "Iman Bakhruz class mentor portrait",
    labelKey: "landing.slide2",
    position: "50% 35%",
  },
  {
    src: teacherPhoto,
    alt: "Iman Bakhruz professional profile portrait",
    labelKey: "landing.slide3",
    position: "50% 52%",
  },
];

const valuePoints = [
  {
    icon: Target,
    titleKey: "landing.featureRoadmapTitle",
    textKey: "landing.featureRoadmapText",
  },
  {
    icon: Users,
    titleKey: "landing.featureGroupsTitle",
    textKey: "landing.featureGroupsText",
  },
  {
    icon: ShieldCheck,
    titleKey: "landing.featureParentsTitle",
    textKey: "landing.featureParentsText",
  },
];

const processSteps = [
  {
    titleKey: "landing.step1Title",
    textKey: "landing.step1Text",
  },
  {
    titleKey: "landing.step2Title",
    textKey: "landing.step2Text",
  },
  {
    titleKey: "landing.step3Title",
    textKey: "landing.step3Text",
  },
];

const socialProof = [
  { labelKey: "landing.studentsTrained", value: "1000+" },
  { labelKey: "landing.expYears", value: "5+ years" },
  { labelKey: "landing.weeklySupport", value: "7 days" },
];

function roleHome(role: "student" | "teacher" | "parent"): string {
  if (role === "teacher") return "/teacher";
  if (role === "parent") return "/parent";
  return "/student";
}

export function HomePage() {
  const { state } = useAppStore();
  const { t } = useUi();
  const [activeSlide, setActiveSlide] = useState(0);

  const teacher = state.teachers[0];
  const displayPhone = teacher?.phone || DEFAULT_PHONE;
  const teacherName = "Iman Bakhruz";
  const dashboardHref = state.session ? roleHome(state.session.role) : "/login";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % teacherSlides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  function goPrev() {
    setActiveSlide((prev) => (prev === 0 ? teacherSlides.length - 1 : prev - 1));
  }

  function goNext() {
    setActiveSlide((prev) => (prev + 1) % teacherSlides.length);
  }

  return (
    <div className="min-h-screen bg-white text-charcoal dark:bg-black dark:text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6">
        <header className="sticky top-2 z-30 rounded-2xl border border-burgundy-100 bg-white/95 px-3 py-2 shadow-soft backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-4">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <BrandLogo
              title={t("app.name")}
              subtitle={t("app.center")}
              size="sm"
              className="max-w-[9rem] sm:max-w-[14rem] lg:max-w-none"
              titleClassName="text-base text-charcoal dark:text-zinc-100 sm:text-lg"
              subtitleClassName="hidden sm:block"
            />

            <div className="flex shrink-0 items-center gap-2">
              <LanguageSwitcher compact mode="single" />
              <ThemeToggle compact />
              {state.session ? (
                <Link to={dashboardHref}>
                  <Button size="sm">
                    <GraduationCap className="mr-1.5 h-4 w-4" />
                    {t("landing.openDashboard")}
                  </Button>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/register">
                    <Button size="sm" variant="secondary" className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                      {t("auth.registerLink")}
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="sm" className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                      <GraduationCap className="mr-1.5 h-4 w-4" />
                      {t("auth.loginButton")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mt-6 space-y-5">
          <Card className="overflow-hidden border-burgundy-200/80 shadow-lift">
            <CardContent className="grid gap-5 bg-gradient-to-br from-burgundy-900 via-burgundy-800 to-burgundy-700 p-5 text-white sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="space-y-3">
                <Badge className="w-fit border-white/25 bg-white/10 text-white">English Growth System</Badge>
                <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{t("landing.heroTitle")}</h2>
                <p className="max-w-3xl text-sm text-white/90 sm:text-base">
                  {t("landing.heroSubtitle")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                  <Button variant="secondary" className="bg-white text-burgundy-800 hover:bg-white/90">
                    {t("landing.bookDiagnostic")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <a href={`tel:${displayPhone.replace(/\s|-/g, "")}`}>
                  <Button variant="ghost" className="border border-white/35 text-white hover:bg-white/10">
                    <PhoneCall className="mr-2 h-4 w-4" />
                    {t("landing.callNow")}
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-burgundy-200/80 shadow-lift">
              <CardContent className="space-y-5 p-5 sm:p-7">
                <Badge className="w-fit border-burgundy-200 bg-burgundy-50 text-burgundy-900 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-burgundy-100">
                  {t("landing.aboutTeacher")}
                </Badge>

                <div>
                  <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{teacherName}</h1>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.08em] text-burgundy-700 dark:text-burgundy-200">
                    {t("landing.yearsExp")}
                  </p>
                </div>

                <div className="space-y-3 text-sm leading-6 text-charcoal/80 dark:text-zinc-300 sm:text-[15px]">
                  {teacherStoryKeys.map((key) => (
                    <p key={key}>{t(key)}</p>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {socialProof.map((item) => (
                    <div
                      key={item.labelKey}
                      className="rounded-2xl border border-burgundy-100 bg-burgundy-50/70 px-3 py-2 dark:border-burgundy-900/40 dark:bg-burgundy-900/25"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55 dark:text-zinc-400">{t(item.labelKey)}</p>
                      <p className="mt-1 text-sm font-bold text-burgundy-700 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {state.session ? (
                    <Link to={dashboardHref}>
                      <Button>
                        {t("landing.openDashboard")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/login">
                        <Button>
                          {t("auth.loginButton")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to="/register">
                        <Button variant="secondary">{t("auth.registerLink")}</Button>
                      </Link>
                    </>
                  )}
                  <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                    <Button variant="ghost">Telegram</Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="overflow-hidden border-burgundy-200/80 shadow-lift">
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="overflow-hidden">
                      <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                      >
                        {teacherSlides.map((slide) => (
                          <div key={slide.labelKey} className="relative w-full shrink-0">
                            <img
                              src={slide.src}
                              alt={slide.alt}
                              className="h-[22rem] w-full object-cover sm:h-[26rem]"
                              style={{ objectPosition: slide.position }}
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4">
                              <p className="text-sm font-semibold text-white">{t(slide.labelKey)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={goPrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/35 p-2 text-white backdrop-blur transition hover:bg-black/55"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/35 p-2 text-white backdrop-blur transition hover:bg-black/55"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
                      {teacherSlides.map((slide, index) => (
                        <button
                          key={slide.labelKey}
                          type="button"
                          onClick={() => setActiveSlide(index)}
                          className={`h-2 rounded-full transition ${index === activeSlide ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                          aria-label={`Slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">Contacts</p>

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
                    <span className="text-burgundy-700 dark:text-white">@iman_bakhruz</span>
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
                    <span className="text-burgundy-700 dark:text-white">@iman.bakhruz</span>
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 p-5">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-zinc-100">
                    <BadgeCheck className="h-4 w-4 text-burgundy-700 dark:text-white" />
                    {t("landing.philosophyTitle")}
                  </p>
                  <p className="text-sm text-charcoal/75 dark:text-zinc-300">
                    {t("landing.philosophyText")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-burgundy-200/80 shadow-soft">
            <CardContent className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
              {valuePoints.map((point) => (
                <div key={point.titleKey} className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-zinc-100">
                    <point.icon className="h-4 w-4 text-burgundy-700 dark:text-white" />
                    {t(point.titleKey)}
                  </p>
                  <p className="mt-2 text-sm text-charcoal/75 dark:text-zinc-300">{t(point.textKey)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-burgundy-200/80 shadow-soft">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-zinc-100">
                <Clock3 className="h-4 w-4 text-burgundy-700 dark:text-white" />
                {t("landing.howItWorks")}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {processSteps.map((step) => (
                  <div key={step.titleKey} className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{t(step.titleKey)}</p>
                    <p className="mt-2 text-sm text-charcoal/75 dark:text-zinc-300">{t(step.textKey)}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-sm font-semibold text-burgundy-800 dark:border-burgundy-800 dark:bg-burgundy-900/35 dark:text-burgundy-100">
                {t("landing.limitedSeats")}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
