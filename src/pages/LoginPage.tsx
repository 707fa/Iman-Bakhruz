import { LogIn, PhoneCall } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PasswordField } from "../components/PasswordField";
import { ThemeToggle } from "../components/ThemeToggle";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { formatUzPhoneInput } from "../lib/utils";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, state } = useAppStore();
  const { t } = useUi();
  const { showToast } = useToast();

  const [phone, setPhone] = useState(() => formatUzPhoneInput(""));
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!state.session) return;
    if (state.session.role === "teacher") navigate("/teacher");
    else navigate("/student");
  }, [state.session, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await login({ phone, password });
      const text = t(result.messageKey, result.messageParams);
      showToast({ message: text, tone: result.ok ? "success" : "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-dvh bg-[#f6f6f8] dark:bg-black lg:min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-burgundy-900 via-burgundy-800 to-burgundy-700 p-10 text-white lg:block">
        <div className="absolute right-8 top-8 z-20 flex items-center gap-2">
          <LanguageSwitcher compact />
          <ThemeToggle compact />
        </div>

        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <BrandLogo
            title={t("app.name")}
            subtitle={t("app.center")}
            size="lg"
            titleClassName="text-white"
            subtitleClassName="text-white/80"
          />

          <h1 className="mt-12 max-w-md text-5xl font-bold leading-tight lg:text-6xl">{t("auth.heroTitle")}</h1>
          <p className="mt-5 max-w-md text-lg text-white/85">{t("auth.heroSubtitle")}</p>

          <div className="mt-8 flex flex-wrap gap-2">
            <Badge className="bg-white/15 text-white">{t("ui.student")}</Badge>
            <Badge className="bg-white/15 text-white">{t("ui.teacher")}</Badge>
          </div>
        </div>
      </section>

      <section className="flex items-start justify-center p-4 pb-8 pt-5 sm:p-8 sm:pt-8 lg:items-center">
        <div className="w-full max-w-md space-y-4">
          <div className="flex min-w-0 items-center justify-between gap-2 lg:hidden">
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

          <Card className="w-full">
            <CardHeader className="space-y-2">
              <CardTitle className="text-3xl font-bold">{t("auth.loginTitle")}</CardTitle>
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
                      onChange={(event) => setPhone(formatUzPhoneInput(event.target.value))}
                      onFocus={() => setPhone((prev) => formatUzPhoneInput(prev))}
                      disabled={isSubmitting}
                      inputMode="tel"
                      autoComplete="tel"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      enterKeyHint="next"
                      placeholder={t("auth.phonePlaceholder")}
                      maxLength={17}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <PasswordField
                    id="password"
                    value={password}
                    onChange={setPassword}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    placeholder={t("auth.passwordPlaceholder")}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {isSubmitting ? `${t("auth.loginButton")}...` : t("auth.loginButton")}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-charcoal/65 dark:text-zinc-400">
                {t("auth.noAccount")}{" "}
                <Link to="/register" className="font-semibold text-burgundy-700 hover:text-burgundy-600 dark:text-burgundy-300 dark:hover:text-burgundy-200">
                  {t("auth.registerLink")}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
