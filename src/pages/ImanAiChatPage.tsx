import { PageHeader } from "../components/PageHeader";
import { ImanAiChatCard } from "../components/ImanAiChatCard";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";

export function ImanAiChatPage() {
  const { state } = useAppStore();
  const { t } = useUi();
  const isTeacherMode = state.session?.role === "teacher";

  const subtitle = isTeacherMode
    ? "Teacher AI workspace: lesson plans, speaking tasks, and homework feedback."
    : t("ai.subtitleStudent");

  return (
    <div className="space-y-6">
      <PageHeader title={t("ai.title")} subtitle={subtitle} />
      <ImanAiChatCard title={isTeacherMode ? "Iman Chat • Teacher Mode" : t("ai.title")} />
    </div>
  );
}

