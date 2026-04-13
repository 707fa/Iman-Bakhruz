import { BookOpenCheck, Check, Clock3, MessageCircle, Phone, ShieldCheck, Sparkles, Trophy, Users2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { TeacherSpotlightCard } from "../components/TeacherSpotlightCard";
import { UserAvatar } from "../components/UserAvatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { platformApi, type TeacherManualPaymentRequest } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";

export function TeacherHomePage() {
  const { state, currentTeacher } = useAppStore();
  const { showToast } = useToast();
  const { t } = useUi();
  const [paymentRequests, setPaymentRequests] = useState<TeacherManualPaymentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);

  if (!currentTeacher) return null;

  const groups = state.groups.filter((group) => currentTeacher.groupIds.includes(group.id));
  const groupIds = new Set(groups.map((group) => group.id));
  const studentsCount = state.students.filter((student) => groupIds.has(student.groupId)).length;
  const ratingsCount = state.ratingLogs.filter((log) => log.teacherId === currentTeacher.id).length;

  useEffect(() => {
    const token = getApiToken();
    if (!token) return;

    let disposed = false;
    const load = async () => {
      setLoadingRequests(true);
      try {
        const requests = await platformApi.getTeacherManualPaymentRequests(token);
        if (!disposed) setPaymentRequests(requests);
      } catch {
        if (!disposed) setPaymentRequests([]);
      } finally {
        if (!disposed) setLoadingRequests(false);
      }
    };

    void load();
    return () => {
      disposed = true;
    };
  }, []);

  async function handleApprove(transactionId: string) {
    const token = getApiToken();
    if (!token) {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
      return;
    }
    setProcessingTxId(transactionId);
    try {
      await platformApi.approveTeacherManualPaymentRequest(token, transactionId, 30);
      const next = await platformApi.getTeacherManualPaymentRequests(token);
      setPaymentRequests(next);
      showToast({ tone: "success", message: "Доступ открыт на 30 дней." });
    } catch {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setProcessingTxId(null);
    }
  }

  async function handleReject(transactionId: string) {
    const token = getApiToken();
    if (!token) {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
      return;
    }
    setProcessingTxId(transactionId);
    try {
      await platformApi.rejectTeacherManualPaymentRequest(token, transactionId);
      const next = await platformApi.getTeacherManualPaymentRequests(token);
      setPaymentRequests(next);
      showToast({ tone: "info", message: "Заявка отклонена." });
    } catch {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setProcessingTxId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("teacher.homeTitle", { name: currentTeacher.fullName })}
        subtitle={t("teacher.homeSubtitle")}
        action={<Badge>{t("teacher.homeBadge")}</Badge>}
      />

      <Card className="overflow-hidden border-burgundy-200/80 shadow-lift">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5">
          <UserAvatar fullName={currentTeacher.fullName} avatarUrl={currentTeacher.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-charcoal dark:text-white">{currentTeacher.fullName}</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-charcoal/70 dark:text-zinc-300">
              <Phone className="h-4 w-4 text-charcoal dark:text-white" />
              {currentTeacher.phone}
            </p>
            <p className="mt-3 text-sm text-charcoal/70 dark:text-zinc-300">{t("teacher.homeAboutText1")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <BookOpenCheck className="h-4 w-4 text-charcoal dark:text-white" />
              {t("teacher.groups")}
            </p>
            <p className="mt-2 text-3xl font-bold text-charcoal dark:text-white">{groups.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <Users2 className="h-4 w-4 text-charcoal dark:text-white" />
              {t("teacher.myStudents")}
            </p>
            <p className="mt-2 text-3xl font-bold text-charcoal dark:text-white">{studentsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-charcoal dark:text-white" />
              {t("teacher.ratingsSet")}
            </p>
            <p className="mt-2 text-3xl font-bold text-charcoal dark:text-white">{ratingsCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <TeacherSpotlightCard teacherId={currentTeacher.id} />

        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-charcoal dark:text-white">
              <Clock3 className="h-4 w-4 text-charcoal dark:text-white" />
              {t("nav.teacherGroups")}
            </p>
            {groups.length === 0 ? (
              <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {t("ui.noData")}
              </p>
            ) : (
              <div className="space-y-2">
                {groups.slice(0, 6).map((group) => (
                  <Link
                    key={group.id}
                    to={`/teacher/group/${group.id}`}
                    className="flex items-center justify-between rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm transition hover:border-burgundy-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
                  >
                    <span className="truncate font-semibold text-charcoal dark:text-white">{group.title}</span>
                    <span className="ml-2 shrink-0 text-charcoal/65 dark:text-zinc-400">{group.time}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <p className="inline-flex items-center gap-2 text-base font-semibold text-charcoal dark:text-white">
            <Sparkles className="h-4 w-4 text-charcoal dark:text-white" />
            {t("teacher.quickActions")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link to="/teacher/dashboard">
              <Button variant="secondary" className="w-full justify-between">
                {t("teacher.managePanel")}
              </Button>
            </Link>
            <Link to="/teacher/groups">
              <Button variant="secondary" className="w-full justify-between">
                {t("nav.teacherGroups")}
              </Button>
            </Link>
            <Link to="/teacher/top">
              <Button variant="secondary" className="w-full justify-between">
                <Trophy className="mr-2 h-4 w-4" />
                {t("nav.teacherTop")}
              </Button>
            </Link>
            <Link to="/teacher/chat">
              <Button variant="secondary" className="w-full justify-between">
                <MessageCircle className="mr-2 h-4 w-4" />
                {t("nav.friendly")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <p className="inline-flex items-center gap-2 text-base font-semibold text-charcoal dark:text-white">
            <ShieldCheck className="h-4 w-4 text-charcoal dark:text-white" />
            Заявки на оплату (временный режим)
          </p>
          {loadingRequests ? (
            <p className="text-sm text-charcoal/70 dark:text-zinc-300">Загрузка...</p>
          ) : paymentRequests.length === 0 ? (
            <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              Новых заявок нет.
            </p>
          ) : (
            <div className="space-y-2">
              {paymentRequests.map((item) => (
                <div
                  key={item.transaction.id}
                  className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <p className="font-semibold text-charcoal dark:text-white">{item.student.fullName}</p>
                  <p className="text-xs text-charcoal/65 dark:text-zinc-400">
                    {item.student.phone} • {item.student.groupTitle ?? "-"} • {item.student.groupTime ?? "-"}
                  </p>
                  <p className="mt-1 text-xs text-charcoal/65 dark:text-zinc-400">
                    Заявка #{item.transaction.id} • {item.transaction.amount.toFixed(0)} UZS
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => void handleApprove(item.transaction.id)}
                      disabled={processingTxId === item.transaction.id}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Подтвердить
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleReject(item.transaction.id)}
                      disabled={processingTxId === item.transaction.id}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Отклонить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
