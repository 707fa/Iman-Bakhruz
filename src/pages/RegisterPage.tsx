import { UserPlus } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PasswordField } from "../components/PasswordField";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { groups as scheduleGroups } from "../data/mockData";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { formatUzPhoneInput } from "../lib/utils";
import type { GroupDaysPattern } from "../types";

export function RegisterPage() {
  const navigate = useNavigate();
  const { state, registerStudent } = useAppStore();
  const { t } = useUi();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(() => formatUzPhoneInput(""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const allowedGroupIds = useMemo(() => new Set(scheduleGroups.map((group) => group.id)), []);
  const registrationGroups = useMemo(() => {
    const filtered = state.groups.filter((group) => allowedGroupIds.has(group.id));
    return filtered.length > 0 ? filtered : state.groups;
  }, [state.groups, allowedGroupIds]);

  const dayPatterns = useMemo(
    () => Array.from(new Set(registrationGroups.map((group) => group.daysPattern))) as GroupDaysPattern[],
    [registrationGroups],
  );

  const [daysPattern, setDaysPattern] = useState<GroupDaysPattern>(dayPatterns[0] ?? "mwf");

  const groupTitles = useMemo(
    () =>
      Array.from(
        new Set(registrationGroups.filter((group) => group.daysPattern === daysPattern).map((group) => group.title)),
      ),
    [registrationGroups, daysPattern],
  );

  const [selectedGroupTitle, setSelectedGroupTitle] = useState(groupTitles[0] ?? "");

  const availableTimes = useMemo(
    () =>
      registrationGroups
        .filter((group) => group.daysPattern === daysPattern && group.title === selectedGroupTitle)
        .map((group) => group.time),
    [registrationGroups, daysPattern, selectedGroupTitle],
  );

  const [time, setTime] = useState(availableTimes[0] ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (dayPatterns.length === 0) return;
    if (dayPatterns.includes(daysPattern)) return;
    setDaysPattern(dayPatterns[0]);
  }, [dayPatterns, daysPattern]);

  useEffect(() => {
    if (groupTitles.length === 0) {
      if (selectedGroupTitle) setSelectedGroupTitle("");
      return;
    }
    if (!groupTitles.includes(selectedGroupTitle)) {
      setSelectedGroupTitle(groupTitles[0]);
    }
  }, [groupTitles, selectedGroupTitle]);

  useEffect(() => {
    if (availableTimes.length === 0) {
      if (time) setTime("");
      return;
    }
    if (!availableTimes.includes(time)) {
      setTime(availableTimes[0]);
    }
  }, [availableTimes, time]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (password !== confirmPassword) {
      showToast({ message: t("msg.registerPasswordMismatch"), tone: "error" });
      return;
    }

    if (!selectedGroupTitle || !time) {
      showToast({ message: t("msg.registerNoSlots"), tone: "error" });
      return;
    }

    const targetGroup = registrationGroups.find(
      (group) => group.title === selectedGroupTitle && group.time === time && group.daysPattern === daysPattern,
    );

    if (!targetGroup) {
      showToast({ message: t("msg.registerGroupInvalid"), tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerStudent({
        fullName,
        phone,
        password,
        confirmPassword,
        groupId: targetGroup.id,
        groupTitle: targetGroup.title,
        time: targetGroup.time,
        daysPattern,
      });

      showToast({
        message: t(result.messageKey, result.messageParams),
        tone: result.ok ? "success" : "error",
      });
      if (result.ok) {
        navigate("/student");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-start justify-center bg-white p-4 pb-8 pt-5 dark:bg-black sm:min-h-screen sm:items-center sm:p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-3">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
            <BrandLogo
              title={t("app.name")}
              subtitle={t("app.center")}
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
          <CardTitle className="text-2xl font-bold sm:text-3xl">{t("auth.registerTitle")}</CardTitle>
          <CardDescription className="max-w-[38ch]">{t("auth.registerSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          <form onSubmit={handleSubmit} className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">{t("auth.fullName")}</Label>
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
                enterKeyHint="next"
                placeholder={t("auth.passwordPlaceholder")}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
              <PasswordField
                id="confirmPassword"
                value={confirmPassword}
                onChange={setConfirmPassword}
                disabled={isSubmitting}
                autoComplete="new-password"
                enterKeyHint="done"
                placeholder={t("auth.confirmPasswordPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("auth.days")}</Label>
              <Select
                value={daysPattern}
                disabled={isSubmitting}
                onValueChange={(value) => {
                  const nextPattern = value as GroupDaysPattern;
                  setDaysPattern(nextPattern);
                  const firstGroup = registrationGroups.find((group) => group.daysPattern === nextPattern);
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
                disabled={isSubmitting}
                onValueChange={(value) => {
                  setSelectedGroupTitle(value);
                  const firstTime =
                    registrationGroups.find((group) => group.daysPattern === daysPattern && group.title === value)?.time ?? "";
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
              <Select value={time} onValueChange={setTime} disabled={isSubmitting}>
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

            <Button type="submit" className="sm:col-span-2" disabled={isSubmitting}>
              <UserPlus className="mr-2 h-4 w-4" />
              {isSubmitting ? `${t("auth.registerButton")}...` : t("auth.registerButton")}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-charcoal/65 dark:text-zinc-400">
            {t("auth.haveAccount")}{" "}
            <Link to="/login" className="font-semibold text-charcoal hover:text-black dark:text-white dark:hover:text-zinc-200">
              {t("auth.loginButton")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
