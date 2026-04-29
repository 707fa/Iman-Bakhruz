import { ArrowRight, CalendarDays, Clock3, Edit2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useUi } from "../hooks/useUi";
import type { Group, Student } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import { motion } from "framer-motion";

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
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group relative overflow-hidden border-burgundy-100/50 bg-white/70 backdrop-blur-md transition-all hover:border-burgundy-200/60 hover:shadow-xl hover:shadow-burgundy-900/5 dark:border-zinc-800/50 dark:bg-zinc-900/70 dark:hover:border-zinc-700/60">
        <div className="absolute inset-0 bg-gradient-to-br from-burgundy-50/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-burgundy-900/10" />
        
        <CardContent className="relative p-0">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex rounded-lg bg-burgundy-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-burgundy-700 dark:bg-burgundy-900/30 dark:text-burgundy-200">
                {t("auth.group")}
              </div>
              {onRename && (
                <Select onValueChange={onRename} disabled={isSaving}>
                  <SelectTrigger hideIcon className="h-9 w-9 rounded-xl border border-burgundy-100 bg-white/50 p-0 shadow-sm transition-colors hover:bg-white hover:text-burgundy-700 focus:ring-burgundy-200 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-950">
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Edit2 className="h-4 w-4 opacity-60 group-hover:opacity-100" />
                    )}
                  </SelectTrigger>
                  <SelectContent align="end" className="rounded-xl border-burgundy-100 dark:border-zinc-800">
                    {PREDEFINED_LEVELS.map((level) => (
                      <SelectItem key={level} value={level} className="rounded-lg focus:bg-burgundy-50 dark:focus:bg-burgundy-900/30">
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="mt-4">
              <h3 className="text-xl font-bold tracking-tight text-charcoal dark:text-white sm:text-2xl">
                {group.title}
              </h3>
              <p className="mt-1 text-sm text-charcoal/50 dark:text-zinc-400">
                {t("teacher.studentsCount", { count: students.length })} {t("landing.students").toLowerCase()}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-charcoal/[0.03] p-3 dark:bg-white/[0.03]">
                <Clock3 className="h-4 w-4 text-burgundy-600 dark:text-burgundy-400" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-charcoal/40 dark:text-zinc-500">{t("auth.time")}</p>
                  <p className="truncate text-xs font-semibold text-charcoal dark:text-zinc-200">{group.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-charcoal/[0.03] p-3 dark:bg-white/[0.03]">
                <CalendarDays className="h-4 w-4 text-burgundy-600 dark:text-burgundy-400" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-charcoal/40 dark:text-zinc-500">{t("auth.days")}</p>
                  <p className="truncate text-xs font-semibold text-charcoal dark:text-zinc-200">{t(`days.${group.daysPattern}`)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-burgundy-100/50 p-4 dark:border-zinc-800/50">
            <Link to={`/teacher/group/${group.id}`}>
              <Button className="h-11 w-full justify-between rounded-xl bg-burgundy-700 px-5 text-sm font-semibold transition-all hover:bg-burgundy-800 hover:shadow-lg hover:shadow-burgundy-900/20 active:scale-[0.98] dark:bg-white dark:text-burgundy-900 dark:hover:bg-zinc-200">
                {t("teacher.openGroup")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
