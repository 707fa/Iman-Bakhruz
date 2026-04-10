import { Bot, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { FlashcardsGame } from "../components/FlashcardsGame";
import { GrammarTopicsCard } from "../components/GrammarTopicsCard";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useUi } from "../hooks/useUi";

export function StudentToolsPage() {
  const { t } = useUi();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Tools"
        subtitle="AI study, grammar topics and flashcards in one place."
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <Link to="/student/ai-chat">
            <Button className="w-full justify-start">
              <Bot className="mr-2 h-4 w-4" />
              {t("ai.title")}
            </Button>
          </Link>
          <Link to="/student/chat">
            <Button variant="secondary" className="w-full justify-start">
              <MessageCircle className="mr-2 h-4 w-4" />
              Iman Friendly
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <GrammarTopicsCard role="student" />
        <FlashcardsGame />
      </div>
    </div>
  );
}
