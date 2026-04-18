import { KetkaFlashcardsGame } from "../components/KetkaFlashcardsGame";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";

export function StudentGamesPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Ketka Game"
        subtitle="Flip cards, learn words, and train daily vocabulary for your level."
        action={<Badge variant="soft">Student</Badge>}
      />

      <KetkaFlashcardsGame />

      <Card>
        <CardContent className="p-4 text-sm text-charcoal/70 dark:text-zinc-300">
          Multiplayer room mode can be enabled after backend room API is connected.
        </CardContent>
      </Card>
    </div>
  );
}
