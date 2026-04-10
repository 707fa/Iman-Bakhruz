import { ArrowRight, CalendarDays, Clock3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useUi } from "../hooks/useUi";
import type { Group, Student } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface GroupCardProps {
  group: Group;
  students: Student[];
}

export function GroupCard({ group, students }: GroupCardProps) {
  const { t } = useUi();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="border-b border-burgundy-100 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="inline-flex rounded-full border border-burgundy-200 bg-burgundy-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
            {t("auth.group")}
          </div>
          <h3 className="mt-2 text-lg font-semibold text-charcoal dark:text-white sm:text-xl">{group.title}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-charcoal/70 dark:text-zinc-300">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-burgundy-700 dark:text-white" />
              {group.time}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-burgundy-700 dark:text-white" />
              {t(`days.${group.daysPattern}`)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-burgundy-700 dark:text-white" />
              {t("teacher.studentsCount", { count: students.length })}
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <Link to={`/teacher/group/${group.id}`}>
            <Button className="w-full justify-between">
              {t("teacher.openGroup")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
