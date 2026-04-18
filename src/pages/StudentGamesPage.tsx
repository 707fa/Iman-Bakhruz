import { MultiplayerKetka } from "../components/MultiplayerKetka";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";

export function StudentGamesPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Ketka Arena"
        subtitle="Создавай домашние карточки, выбирай соперников и играй в современные English games на уроке."
        action={<Badge variant="soft">Student games</Badge>}
      />
      <MultiplayerKetka />
    </div>
  );
}
