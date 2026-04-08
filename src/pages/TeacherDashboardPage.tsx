import { BookOpenCheck, Bot, ClipboardList, MessageCircle, Trophy, Users2, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";

export function TeacherDashboardPage() {
  const { state, currentTeacher } = useAppStore();
  const { t } = useUi();

  if (!currentTeacher) return null;

  const teacherGroupIds = new Set(currentTeacher.groupIds);
  const studentsCount = state.students.filter((student) => teacherGroupIds.has(student.groupId)).length;
  const ratingsCount = state.ratingLogs.filter((log) => log.teacherId === currentTeacher.id).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("teacher.title", { name: currentTeacher.fullName })}
        subtitle={t("teacher.subtitle")}
        action={<Badge variant="soft">{t("teacher.badge")}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <BookOpenCheck className="h-4 w-4 text-burgundy-600 dark:text-burgundy-300" />
              {t("teacher.groups")}
            </p>
            <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-burgundy-300">{currentTeacher.groupIds.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <Users2 className="h-4 w-4 text-burgundy-600 dark:text-burgundy-300" />
              {t("teacher.myStudents")}
            </p>
            <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-burgundy-300">{studentsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <ClipboardList className="h-4 w-4 text-burgundy-600 dark:text-burgundy-300" />
              {t("teacher.ratingsSet")}
            </p>
            <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-burgundy-300">{ratingsCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-base font-semibold text-charcoal dark:text-zinc-100">{t("nav.teacherGroups")}</p>
            <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">{t("teacher.groups")}</p>
            <Link to="/teacher/groups" className="mt-4 inline-block">
              <Button variant="secondary">{t("nav.teacherGroups")}</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-charcoal dark:text-zinc-100">
              <Trophy className="h-4 w-4 text-burgundy-700 dark:text-burgundy-300" />
              {t("nav.teacherTop")}
            </p>
            <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">{t("teacher.topAll")}</p>
            <Link to="/teacher/top" className="mt-4 inline-block">
              <Button variant="secondary">{t("nav.teacherTop")}</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-charcoal dark:text-zinc-100">
              <Wrench className="h-4 w-4 text-burgundy-700 dark:text-burgundy-300" />
              Teacher Tools
            </p>
            <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">Grammar topics and support.</p>
            <Link to="/teacher/tools" className="mt-4 inline-block">
              <Button variant="secondary">Open tools</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-charcoal dark:text-zinc-100">
              <Bot className="h-4 w-4 text-burgundy-700 dark:text-burgundy-300" />
              {t("ai.title")}
            </p>
            <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">{t("ai.subtitleTeacher")}</p>
            <div className="mt-4 flex gap-2">
              <Link to="/teacher/ai-chat" className="inline-block">
                <Button variant="secondary" size="sm">AI</Button>
              </Link>
              <Link to="/teacher/chat" className="inline-block">
                <Button variant="secondary" size="sm">
                  <MessageCircle className="mr-1 h-3.5 w-3.5" />
                  Chat
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
