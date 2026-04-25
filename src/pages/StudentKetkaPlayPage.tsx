import { MultiplayerKetka } from "../components/MultiplayerKetka";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";

export function StudentKetkaPlayPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Ketka Match"
        subtitle="Focused gameplay screen for phone and desktop. Setup is separated so match controls stay clean."
        action={<Badge variant="soft">Play</Badge>}
      />
      <MultiplayerKetka viewMode="match" />
    </div>
  );
}
