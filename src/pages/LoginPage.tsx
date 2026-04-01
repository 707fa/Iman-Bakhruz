import { Building2, LogIn, PhoneCall, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, state } = useAppStore();
  const { t } = useUi();

  const [phone, setPhone] = useState("+998901111111");
  const [password, setPassword] = useState("teacher123");
  const [message, setMessage] = useState<{ key: string; params?: Record<string, string | number> } | null>(null);

  useEffect(() => {
    if (!state.session) return;
    if (state.session.role === "teacher") navigate("/teacher");
    else navigate("/student");
  }, [state.session, navigate]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = login({ phone, password });
    setMessage({ key: result.messageKey, params: result.messageParams });
  }

  return (
    <div className="grid min-h-screen bg-[#f6f6f8] dark:bg-[#0b0b0d] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-burgundy-900 via-burgundy-800 to-burgundy-700 p-10 text-white lg:block">
        <div className="absolute right-8 top-8 flex items-center gap-2">
          <LanguageSwitcher compact />
          <ThemeToggle compact />
        </div>

        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-3">
            <span className="grid h-12 w-12 place-content-center rounded-2xl bg-white/15 text-sm font-bold tracking-[0.16em]">R</span>
            <div>
              <p className="font-display text-4xl">{t("app.name")}</p>
              <p className="text-sm text-white/80">{t("app.center")}</p>
            </div>
          </div>
          <h1 className="mt-12 max-w-md font-display text-6xl leading-tight">{t("auth.heroTitle")}</h1>
          <p className="mt-5 max-w-md text-lg text-white/85">{t("auth.heroSubtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Badge className="bg-white/15 text-white">{t("ui.student")}</Badge>
            <Badge className="bg-white/15 text-white">{t("ui.teacher")}</Badge>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-end gap-2 lg:hidden">
              <LanguageSwitcher compact />
              <ThemeToggle compact />
            </div>
            <CardTitle className="text-3xl">{t("auth.loginTitle")}</CardTitle>
            <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t("auth.phone")}</Label>
                <div className="relative">
                  <PhoneCall className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-burgundy-500" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    inputMode="tel"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                <LogIn className="mr-2 h-4 w-4" />
                {t("auth.loginButton")}
              </Button>
            </form>

            {message ? (
              <p className="mt-4 rounded-xl bg-burgundy-50 px-3 py-2 text-sm text-burgundy-700 dark:bg-burgundy-900/40 dark:text-burgundy-200">
                {t(message.key, message.params)}
              </p>
            ) : null}

            <div className="mt-5 rounded-2xl border border-burgundy-100 bg-slate-50 p-3 text-xs text-charcoal/75 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <p className="mb-1 inline-flex items-center gap-1 font-semibold text-charcoal dark:text-zinc-100">
                <Building2 className="h-3.5 w-3.5 text-burgundy-600" />
                {t("auth.demoUsers")}
              </p>
              <p>Teacher: +998901111111 / teacher123</p>
              <p>Student: +998903000001 / student123</p>
              <p className="mt-1 inline-flex items-center gap-1 text-burgundy-700 dark:text-burgundy-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("auth.safeMode")}
              </p>
            </div>

            <p className="mt-5 text-center text-sm text-charcoal/65 dark:text-zinc-400">
              {t("auth.noAccount")}{" "}
              <Link to="/register" className="font-semibold text-burgundy-700 hover:text-burgundy-600 dark:text-burgundy-300 dark:hover:text-burgundy-200">
                {t("auth.registerLink")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
