import { ArrowRight, CalendarDays, Clock3, Edit2, Loader2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useUi } from "../hooks/useUi";
import type { Group, Student } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";

const PREDEFINED_LEVELS = [
  "Beginner",
  "Elementary",
  "Pre-Intermediate",
  "Intermediate",
  "Upper-Intermediate",
  "Advanced",
  "IELTS 5.5",
  "IELTS 6.0",
  "IELTS 6.5",
  "IELTS 7.0+",
  "CEFR B1",
  "CEFR B2",
  "Kids Level 1",
  "Kids Level 2",
];

interface GroupCardProps {
  group: Group;
  students: Student[];
  onRename?: (nextTitle: string) => void;
  isSaving?: boolean;
}

export function GroupCard({ group, students, onRename, isSaving }: GroupCardProps) {
  const { t } = useUi();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="border-b border-burgundy-100 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-full border border-burgundy-200 bg-burgundy-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
              {t("auth.group")}
            </div>
            {onRename && (
              <Select onValueChange={onRename} disabled={isSaving}>
                <SelectTrigger hideIcon className="h-8 w-8 rounded-full border-none bg-transparent p-0 shadow-none ring-0 focus:ring-0 dark:bg-transparent">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-charcoal/50" /> : <Edit2 className="h-4 w-4 text-charcoal/50 hover:text-burgundy-700 dark:text-zinc-400 dark:hover:text-white" />}
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
