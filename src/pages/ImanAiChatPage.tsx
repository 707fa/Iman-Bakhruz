import { PageHeader } from "../components/PageHeader";
import { ImanAiChatCard } from "../components/ImanAiChatCard";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";

export function ImanAiChatPage() {
  const { state } = useAppStore();
  const { t } = useUi();

  const subtitle = state.session?.role === "teacher" ? t("ai.subtitleTeacher") : t("ai.subtitleStudent");

  return (
    <div className="space-y-6">
      <PageHeader title={t("ai.title")} subtitle={subtitle} />
      <ImanAiChatCard title={t("ai.title")} />
    </div>
  );
}

