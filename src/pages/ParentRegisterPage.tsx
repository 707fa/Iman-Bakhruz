import { UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PasswordField } from "../components/PasswordField";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { formatUzPhoneInput } from "../lib/utils";

export function ParentRegisterPage() {
  const navigate = useNavigate();
  const { registerParent } = useAppStore();
  const { showToast } = useToast();
  const { t } = useUi();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(() => formatUzPhoneInput(""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [parentInviteCode, setParentInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (password !== confirmPassword) {
      showToast({ message: t("msg.registerPasswordMismatch"), tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerParent({
        fullName,
        phone,
        password,
        confirmPassword,
        parentInviteCode,
      });

      showToast({
        message:
          result.messageKey === "msg.parentRegisterSuccess"
            ? t("msg.parentRegisterSuccess", { child: result.messageParams?.child ?? "" })
            : t(result.messageKey),
        tone: result.ok ? "success" : "error",
      });

      if (result.ok) {
        navigate("/parent", { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-start justify-center bg-white p-4 pb-8 pt-5 dark:bg-black sm:min-h-screen sm:items-center sm:p-8">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-3">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
            <BrandLogo
              title="Iman | Bakhruz"
              subtitle="Parent Access"
              size="sm"
              className="min-w-0 flex-1"
              titleClassName="text-sm text-charcoal dark:text-white sm:text-base"
              subtitleClassName="hidden sm:block"
            />
            <div className="flex shrink-0 items-center gap-2">
              <LanguageSwitcher compact mode="single" />
              <ThemeToggle compact />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold sm:text-3xl">{t("auth.parentRegisterTitle")}</CardTitle>
          <CardDescription className="max-w-[38ch]">
            {t("auth.parentRegisterSubtitle")}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("auth.parentFullName")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={isSubmitting}
                placeholder={t("auth.fullNamePlaceholder")}
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("auth.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(formatUzPhoneInput(event.target.value))}
                disabled={isSubmitting}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+998 90-111-22-33"
                maxLength={17}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="childCode">{t("auth.parentChildCode")}</Label>
              <Input
                id="childCode"
                value={parentInviteCode}
                onChange={(event) => setParentInviteCode(event.target.value.toUpperCase())}
                disabled={isSubmitting}
                placeholder={t("auth.parentChildCodePlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <PasswordField
                id="password"
                value={password}
                onChange={setPassword}
                disabled={isSubmitting}
                autoComplete="new-password"
                placeholder={t("auth.passwordPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
              <PasswordField
                id="confirmPassword"
                value={confirmPassword}
                onChange={setConfirmPassword}
                disabled={isSubmitting}
                autoComplete="new-password"
                placeholder={t("auth.confirmPasswordPlaceholder")}
              />
            </div>

            <Button type="submit" className="h-11 rounded-2xl" disabled={isSubmitting}>
              <UserPlus className="mr-2 h-4 w-4" />
              {isSubmitting ? t("auth.parentCreating") : t("auth.parentCreateButton")}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-charcoal/65 dark:text-zinc-400">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link to="/login" className="font-semibold text-charcoal hover:text-black dark:text-white dark:hover:text-zinc-200">
              Войти
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
