import { UserPlus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import type { GroupDaysPattern } from "../types";

export function RegisterPage() {
  const navigate = useNavigate();
  const { state, registerStudent } = useAppStore();
  const { t } = useUi();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const dayPatterns = useMemo(
    () => Array.from(new Set(state.groups.map((group) => group.daysPattern))) as GroupDaysPattern[],
    [state.groups],
  );

  const [daysPattern, setDaysPattern] = useState<GroupDaysPattern>(dayPatterns[0] ?? "mwf");

  const groupTitles = useMemo(
    () => Array.from(new Set(state.groups.filter((group) => group.daysPattern === daysPattern).map((group) => group.title))),
    [state.groups, daysPattern],
  );

  const [selectedGroupTitle, setSelectedGroupTitle] = useState(groupTitles[0] ?? "");

  const availableTimes = useMemo(
    () =>
      state.groups
        .filter((group) => group.daysPattern === daysPattern && group.title === selectedGroupTitle)
        .map((group) => group.time),
    [state.groups, daysPattern, selectedGroupTitle],
  );

  const [time, setTime] = useState(availableTimes[0] ?? "");

  const [message, setMessage] = useState<{ key: string; params?: Record<string, string | number> } | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setMessage({ key: "msg.registerPasswordMismatch" });
      return;
    }

    if (!selectedGroupTitle || !time) {
      setMessage({ key: "msg.registerNoSlots" });
      return;
    }

    const targetGroup = state.groups.find(
      (group) => group.title === selectedGroupTitle && group.time === time && group.daysPattern === daysPattern,
    );

    if (!targetGroup) {
      setMessage({ key: "msg.registerGroupInvalid" });
      return;
    }

    const result = registerStudent({
      fullName,
      phone,
      password,
      groupId: targetGroup.id,
      time,
      daysPattern,
    });

    setMessage({ key: result.messageKey, params: result.messageParams });
    if (result.ok) navigate("/student");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8] p-4 dark:bg-black sm:p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BrandLogo
              title={t("app.name")}
              subtitle={t("app.center")}
              size="md"
              titleClassName="text-burgundy-800 dark:text-burgundy-300"
            />
            <div className="flex items-center gap-2">
              <LanguageSwitcher compact />
              <ThemeToggle compact />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">{t("auth.registerTitle")}</CardTitle>
          <CardDescription>{t("auth.registerSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">{t("auth.fullName")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
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
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("auth.phonePlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder={t("auth.passwordPlaceholder")}
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder={t("auth.confirmPasswordPlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("auth.days")}</Label>
              <Select
                value={daysPattern}
                onValueChange={(value) => {
                  const nextPattern = value as GroupDaysPattern;
                  setDaysPattern(nextPattern);
                  const firstGroup = state.groups.find((group) => group.daysPattern === nextPattern);
                  setSelectedGroupTitle(firstGroup?.title ?? "");
                  setTime(firstGroup?.time ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("auth.selectDays")} />
                </SelectTrigger>
                <SelectContent>
                  {dayPatterns.map((pattern) => (
                    <SelectItem key={pattern} value={pattern}>
                      {t(`days.${pattern}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("auth.group")}</Label>
              <Select
                value={selectedGroupTitle}
                onValueChange={(value) => {
                  setSelectedGroupTitle(value);
                  const firstTime =
                    state.groups.find((group) => group.daysPattern === daysPattern && group.title === value)?.time ?? "";
                  setTime(firstTime);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("auth.selectGroup")} />
                </SelectTrigger>
                <SelectContent>
                  {groupTitles.map((groupTitle) => (
                    <SelectItem key={groupTitle} value={groupTitle}>
                      {groupTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>{t("auth.time")}</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue placeholder={t("auth.selectTime")} />
                </SelectTrigger>
                <SelectContent>
                  {availableTimes.map((itemTime) => (
                    <SelectItem key={itemTime} value={itemTime}>
                      {itemTime}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="sm:col-span-2">
              <UserPlus className="mr-2 h-4 w-4" />
              {t("auth.registerButton")}
            </Button>
          </form>

          {message ? (
            <p className="mt-4 rounded-xl bg-burgundy-50 px-3 py-2 text-sm text-burgundy-700 dark:bg-burgundy-900/40 dark:text-burgundy-200">
              {t(message.key, message.params)}
            </p>
          ) : null}

          <p className="mt-5 text-center text-sm text-charcoal/65 dark:text-zinc-400">
            {t("auth.haveAccount")}{" "}
            <Link to="/login" className="font-semibold text-burgundy-700 hover:text-burgundy-600 dark:text-burgundy-300 dark:hover:text-burgundy-200">
              {t("auth.loginButton")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
