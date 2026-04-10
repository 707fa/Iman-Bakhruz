import { Bot, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { GrammarTopicsCard } from "../components/GrammarTopicsCard";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useUi } from "../hooks/useUi";

export function TeacherToolsPage() {
  const { t } = useUi();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Tools"
        subtitle="Manage grammar materials and communicate fast."
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <Link to="/teacher/ai-chat">
            <Button className="w-full justify-start">
              <Bot className="mr-2 h-4 w-4" />
              {t("ai.title")}
            </Button>
          </Link>
          <Link to="/teacher/chat">
            <Button variant="secondary" className="w-full justify-start">
              <MessageCircle className="mr-2 h-4 w-4" />
              Iman Friendly
            </Button>
          </Link>
        </CardContent>
      </Card>

      <GrammarTopicsCard role="teacher" />
    </div>
  );
}
