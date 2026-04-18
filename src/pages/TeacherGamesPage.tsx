import { EnglishGamesArena } from "../components/EnglishGamesArena";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";

export function TeacherGamesPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Games & Battle Hub"
        subtitle="Run engaging AI-generated games for your students and track battle performance by group or globally."
        action={<Badge variant="soft">Teacher</Badge>}
      />
      <EnglishGamesArena role="teacher" />
    </div>
  );
}
