import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { TELEGRAM_BOT_URL } from "../lib/env";
import { ApiError } from "../services/api/http";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import type { PaymentTransaction, SubscriptionState } from "../types";

function toTelegramStartPayload(...parts: Array<string | number | null | undefined>): string {
  const payload = parts
    .filter((part) => part !== null && part !== undefined && String(part).trim())
    .map((part) => String(part).trim())
    .join("_")
    .replace(/[^A-Za-z0-9_-]/g, "_");

  return (payload || "receipt").slice(0, 64);
}

function buildTelegramBotStartUrl(botUrl: string, payload: string): string {
  const joiner = botUrl.includes("?") ? "&" : "?";
  return `${botUrl}${joiner}start=${encodeURIComponent(payload)}`;
}

export function StudentSubscriptionPage() {
  const navigate = useNavigate();
  const { state, currentStudentAccess, refreshState, isApiMode } = useAppStore();
  const { t } = useUi();
  const { showToast } = useToast();
  const token = isApiMode ? getApiToken() : null;

  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [subState, setSubState] = useState<SubscriptionState | undefined>(state.session?.isPaid === undefined ? undefined : {
    isPaid: Boolean(state.session?.isPaid),
    paidUntil: state.session?.paidUntil,
    required: true,
  });
  const [lastTx, setLastTx] = useState<PaymentTransaction | null>(null);

  useEffect(() => {
    if (!isApiMode || !token) return;
    let disposed = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await platformApi.getPaymentStatus(token);
        if (disposed) return;
        setSubState(response.subscription);
        setLastTx(response.lastTransaction);
      } catch {
        // keep local state
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void load();
    return () => {
      disposed = true;
    };
  }, [isApiMode, token]);

  const isPaidBySubscription = subState?.isPaid ?? Boolean(state.session?.isPaid);
  const isPaid = Boolean(currentStudentAccess?.hasFullAccess || isPaidBySubscription);
  const isTop5Access = currentStudentAccess?.source === "top5";
  const accessUntil = currentStudentAccess?.paidUntil ?? subState?.paidUntil ?? state.session?.paidUntil;

  async function handleCreatePaymentRequest() {
    if (!isApiMode || !token) {
      showToast({ tone: "error", message: t("pay.providerUnavailable") });
      return;
    }
    setLoading(true);
    try {
      const response = await platformApi.createPayment(token, "manual");
      setSubState(response.subscription);
      setLastTx(response.transaction);

      const url = response.transaction?.checkoutUrl;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      showToast({ tone: "success", message: t("pay.manualRequested") });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 503 || error.status === 402) {
          showToast({ tone: "error", message: t("pay.providerUnavailable") });
          return;
        }
        if (error.status === 401) {
          showToast({ tone: "error", message: t("msg.reloginRequired") });
          return;
        }
      }
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshStatus() {
    if (!isApiMode || !token) {
      showToast({ tone: "error", message: t("pay.providerUnavailable") });
      return;
    }
    setLoading(true);
    try {
      const response = await platformApi.getPaymentStatus(token);
      setSubState(response.subscription);
      setLastTx(response.lastTransaction);
      await refreshState();

      if (response.subscription?.isPaid) {
        showToast({ tone: "success", message: t("pay.active") });
        navigate("/student", { replace: true });
      } else {
        showToast({ tone: "info", message: t("pay.pending") });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        showToast({ tone: "error", message: t("msg.reloginRequired") });
        return;
      }
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadReceipt() {
    if (!isApiMode || !token) {
      showToast({ tone: "error", message: t("pay.providerUnavailable") });
      return;
    }
    if (!receiptFile) {
      showToast({ tone: "error", message: "Сначала выберите фото чека." });
      return;
    }

    setUploadingReceipt(true);
    try {
      const response = await platformApi.uploadManualReceipt(token, receiptFile, lastTx?.id);
      setSubState(response.subscription);
      setLastTx(response.transaction ?? null);
      setReceiptFile(null);
      showToast({
        tone: "success",
        message: response.telegramNotified
          ? t("pay.receiptSentTelegram")
          : t("pay.receiptUploaded"),
      });
      if (TELEGRAM_BOT_URL) {
        const startPayload = toTelegramStartPayload("receipt", state.session?.userId, response.transaction?.id ?? lastTx?.id);
        window.location.assign(buildTelegramBotStartUrl(TELEGRAM_BOT_URL, startPayload));
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        showToast({ tone: "error", message: t("msg.reloginRequired") });
        return;
      }
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setUploadingReceipt(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pay.title")}
        subtitle={t("pay.subtitle")}
        action={<Badge variant="soft">{isPaid ? t("pay.activeShort") : t("pay.requiredShort")}</Badge>}
      />

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          {isPaid ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
              <p className="inline-flex items-center gap-2 text-base font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                {t("pay.active")}
              </p>
              {isTop5Access ? <p className="mt-1 text-sm">{t("promo.top5WeeklyFree")}</p> : null}
              {accessUntil ? <p className="mt-1 text-sm">{t("pay.until", { date: accessUntil })}</p> : null}
              <div className="mt-3">
                <Link to="/student/top">
                  <Button>{t("tabs.global")}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-burgundy-200 bg-burgundy-50 p-4 dark:border-burgundy-900/40 dark:bg-burgundy-900/20">
              <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{t("pay.required")}</p>
              <p className="mt-1 text-sm text-charcoal/75 dark:text-zinc-300">{t("pay.freeHint")}</p>
              <p className="mt-2 text-sm text-charcoal/75 dark:text-zinc-300">{t("pay.manualHint")}</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-1">
            <Button type="button" className="w-full" onClick={() => void handleCreatePaymentRequest()} disabled={loading || isPaid}>
              <CreditCard className="mr-2 h-4 w-4" />
              {t("pay.requestAccess")}
            </Button>
          </div>

          {!isPaid ? (
            <div className="space-y-3 rounded-2xl border border-border p-3">
              <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{t("pay.uploadReceipt")}</p>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleUploadReceipt()}
                  disabled={uploadingReceipt || !receiptFile}
                >
                  {uploadingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t("pay.sendReceipt")}
                </Button>
                {lastTx?.receiptUrl ? (
                  <a href={lastTx.receiptUrl} target="_blank" rel="noreferrer">
                    <Button type="button" variant="ghost">{t("pay.openLastReceipt")}</Button>
                  </a>
                ) : null}
              </div>
              {lastTx?.manualVerdict ? (
                <p className="text-xs text-charcoal/70 dark:text-zinc-400">
                  {t("pay.aiVerdict")}:{" "}
                  {lastTx.manualVerdict === "likely_valid"
                    ? t("pay.verdictValid")
                    : lastTx.manualVerdict === "likely_fake"
                      ? t("pay.verdictFake")
                      : t("pay.verdictPending")}{" "}
                  {lastTx.manualVerdictReason ? `- ${lastTx.manualVerdictReason}` : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="ghost" onClick={() => void handleRefreshStatus()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("pay.checkStatus")}
            </Button>
            {lastTx ? (
              <p className="text-xs text-charcoal/65 dark:text-zinc-400">
                {t("pay.lastTx")}: #{lastTx.id} ({lastTx.provider}, {lastTx.status})
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
