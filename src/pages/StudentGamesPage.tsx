import { MultiplayerKetka } from "../components/MultiplayerKetka";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";

export function StudentGamesPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Ketka Arena"
        subtitle="Create homework cards, check card list comfortably on mobile, invite classmates, then open dedicated match page."
        action={<Badge variant="soft">Student games</Badge>}
      />
      <MultiplayerKetka viewMode="setup" />
    </div>
  );
}
