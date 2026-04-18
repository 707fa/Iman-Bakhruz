import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, GraduationCap, Instagram, PhoneCall, Send } from "lucide-react";
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

const TELEGRAM_URL = "https://t.me/iman_bekhruz";
const INSTAGRAM_URL = "https://instagram.com/iman.bekhruz";
const DEFAULT_PHONE = "+998 90 978-82-55";

const teacherStory = [
  "Hi, I'm Iman Bekhruz. I'm a CELTA & IELTS certified teacher with over 5 years of teaching experience.",
  "During this time, I've worked with 1000+ students, helping them not only achieve high IELTS scores but also build confidence and discipline.",
  "For me, teaching is not just about grammar or vocabulary. I focus on developing my students' mindset, character, and communication skills.",
  "My teaching style is strict, energetic, and demanding, because I care about real results. I push my students to go beyond their limits and become the best version of themselves.",
  "By the will and with the help of Allah, I strive to guide my students toward success and meaningful growth.",
];

const teacherSlides = [
  {
    src: teacherPhoto,
    alt: "Iman Bekhruz teacher portrait",
    label: "CELTA & IELTS Certified",
    position: "50% 18%",
  },
  {
    src: teacherPhoto,
    alt: "Iman Bekhruz class mentor portrait",
    label: "1000+ Students Coached",
    position: "50% 35%",
  },
  {
    src: teacherPhoto,
    alt: "Iman Bekhruz professional profile portrait",
    label: "Strict and Results-Driven Approach",
    position: "50% 52%",
  },
];

function roleHome(role: "student" | "teacher" | "parent"): string {
  if (role === "teacher") return "/teacher";
  if (role === "parent") return "/parent";
  return "/student";
}

export function HomePage() {
  const { state } = useAppStore();
  const [activeSlide, setActiveSlide] = useState(0);

  const teacher = state.teachers[0];
  const displayPhone = teacher?.phone || DEFAULT_PHONE;
  const teacherName = "Iman Bekhruz";
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
              title="Iman | Bekhruz"
              subtitle="Education Center"
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
                    Open Dashboard
                  </Button>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/register">
                    <Button size="sm" variant="secondary" className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                      Register
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="sm" className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                      <GraduationCap className="mr-1.5 h-4 w-4" />
                      Login
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-burgundy-200/80 shadow-lift">
            <CardContent className="space-y-5 p-5 sm:p-7">
              <Badge className="w-fit border-burgundy-200 bg-burgundy-50 text-burgundy-900 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-burgundy-100">
                About Teacher
              </Badge>

              <div>
                <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{teacherName}</h1>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.08em] text-burgundy-700 dark:text-burgundy-200">
                  CELTA & IELTS Certified | 5+ Years Experience
                </p>
              </div>

              <div className="space-y-3 text-sm leading-6 text-charcoal/80 dark:text-zinc-300 sm:text-[15px]">
                {teacherStory.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-burgundy-100 bg-burgundy-50/70 px-3 py-2 dark:border-burgundy-900/40 dark:bg-burgundy-900/25">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55 dark:text-zinc-400">Experience</p>
                  <p className="mt-1 text-sm font-bold text-burgundy-700 dark:text-white">5+ years</p>
                </div>
                <div className="rounded-2xl border border-burgundy-100 bg-burgundy-50/70 px-3 py-2 dark:border-burgundy-900/40 dark:bg-burgundy-900/25">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55 dark:text-zinc-400">Students</p>
                  <p className="mt-1 text-sm font-bold text-burgundy-700 dark:text-white">1000+</p>
                </div>
                <div className="rounded-2xl border border-burgundy-100 bg-burgundy-50/70 px-3 py-2 dark:border-burgundy-900/40 dark:bg-burgundy-900/25">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55 dark:text-zinc-400">Method</p>
                  <p className="mt-1 text-sm font-bold text-burgundy-700 dark:text-white">Strict + Supportive</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {state.session ? (
                  <Link to={dashboardHref}>
                    <Button>
                      Open Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login">
                      <Button>
                        Login
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/register">
                      <Button variant="secondary">Register</Button>
                    </Link>
                  </>
                )}
                <Link to="/home-center">
                  <Button variant="ghost">Old Home</Button>
                </Link>
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
                        <div key={slide.label} className="relative w-full shrink-0">
                          <img
                            src={slide.src}
                            alt={slide.alt}
                            className="h-[22rem] w-full object-cover sm:h-[26rem]"
                            style={{ objectPosition: slide.position }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4">
                            <p className="text-sm font-semibold text-white">{slide.label}</p>
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
                        key={slide.label}
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
                    Phone
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-5">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-zinc-100">
                  <BadgeCheck className="h-4 w-4 text-burgundy-700 dark:text-white" />
                  Teaching Philosophy
                </p>
                <p className="text-sm text-charcoal/75 dark:text-zinc-300">
                  Real discipline, real progress, real communication skills. The focus is not only IELTS score, but strong character and consistent growth.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
