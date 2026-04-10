import { EnglishGamesArena } from "../components/EnglishGamesArena";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";

export function StudentGamesPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="AI Games Arena"
        subtitle="Every round is generated dynamically by AI with instant answer checks and useful feedback."
        action={<Badge variant="soft">Student</Badge>}
      />
      <EnglishGamesArena role="student" />
    </div>
  );
}
