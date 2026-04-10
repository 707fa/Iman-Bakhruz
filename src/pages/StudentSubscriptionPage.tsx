import { CheckCircle2, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import type { PaymentProvider, PaymentTransaction, SubscriptionState } from "../types";

export function StudentSubscriptionPage() {
  const navigate = useNavigate();
  const { state, refreshState } = useAppStore();
  const { t } = useUi();
  const { showToast } = useToast();
  const token = getApiToken();

  const [loading, setLoading] = useState(false);
  const [subState, setSubState] = useState<SubscriptionState | undefined>(state.session?.isPaid === undefined ? undefined : {
    isPaid: Boolean(state.session?.isPaid),
    paidUntil: state.session?.paidUntil,
    required: true,
  });
  const [lastTx, setLastTx] = useState<PaymentTransaction | null>(null);

  useEffect(() => {
    if (!token) return;
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
  }, [token]);

  const isPaid = subState?.isPaid ?? Boolean(state.session?.isPaid);

  async function handleCreatePayment(provider: PaymentProvider) {
    if (!token) return;
    setLoading(true);
    try {
      const response = await platformApi.createPayment(token, provider);
      setSubState(response.subscription);
      setLastTx(response.transaction);

      const url = response.transaction?.checkoutUrl;
      if (!url) {
        showToast({ tone: "error", message: t("pay.providerUnavailable") });
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
      showToast({ tone: "success", message: t("pay.redirected") });
    } catch {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshStatus() {
    if (!token) return;
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
    } catch {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setLoading(false);
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
              {subState?.paidUntil ? <p className="mt-1 text-sm">{t("pay.until", { date: subState.paidUntil })}</p> : null}
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
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" className="w-full" onClick={() => void handleCreatePayment("payme")} disabled={loading || isPaid}>
              <CreditCard className="mr-2 h-4 w-4" />
              Payme
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={() => void handleCreatePayment("click")} disabled={loading || isPaid}>
              <CreditCard className="mr-2 h-4 w-4" />
              Click
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>

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
