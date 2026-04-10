import { Award, BookOpenCheck, ClipboardList, Users2 } from "lucide-react";
import { useMemo } from "react";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { UserAvatar } from "./UserAvatar";
import { Card, CardContent } from "./ui/card";

interface TeacherSpotlightCardProps {
  teacherId: string;
}

export function TeacherSpotlightCard({ teacherId }: TeacherSpotlightCardProps) {
  const { state } = useAppStore();
  const { t } = useUi();

  const teacher = state.teachers.find((item) => item.id === teacherId);

  const teacherGroups = useMemo(() => state.groups.filter((group) => group.teacherId === teacherId), [state.groups, teacherId]);
  const teacherGroupIds = useMemo(() => new Set(teacherGroups.map((group) => group.id)), [teacherGroups]);
  const teacherStudents = useMemo(
    () => state.students.filter((student) => teacherGroupIds.has(student.groupId)),
    [state.students, teacherGroupIds],
  );
  const ratingsCount = useMemo(
    () => state.ratingLogs.filter((log) => log.teacherId === teacherId).length,
    [state.ratingLogs, teacherId],
  );

  const awards = useMemo(() => {
    const result: string[] = [];
    if (teacherGroups.length >= 4) result.push(t("award.groupLeader"));
    if (teacherStudents.length >= 20) result.push(t("award.studentsMentor"));
    if (ratingsCount >= 30) result.push(t("award.progressCoach"));
    if (result.length === 0) result.push(t("award.activeMentor"));
    return result;
  }, [teacherGroups.length, teacherStudents.length, ratingsCount, t]);

  if (!teacher) return null;

  return (
    <Card className="overflow-hidden border-burgundy-200/80">
      <CardContent className="p-0">
        <div className="border-b border-burgundy-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5">
          <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("home.teacherInfoTitle")}</p>
          <p className="mt-1 text-sm text-charcoal/70 dark:text-zinc-300">{t("home.teacherInfoSubtitle")}</p>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <UserAvatar fullName={teacher.fullName} avatarUrl={teacher.avatarUrl} />
            <div>
              <p className="text-base font-semibold text-charcoal dark:text-zinc-100">{teacher.fullName}</p>
              <p className="text-xs text-charcoal/60 dark:text-zinc-400">{t("role.teacher")}</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">
                <BookOpenCheck className="h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
                {t("home.teacherGroups")}
              </p>
              <p className="mt-1 text-xl font-bold text-burgundy-700 dark:text-white">{teacherGroups.length}</p>
            </div>
            <div className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">
                <Users2 className="h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
                {t("home.teacherStudents")}
              </p>
              <p className="mt-1 text-xl font-bold text-burgundy-700 dark:text-white">{teacherStudents.length}</p>
            </div>
            <div className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">
                <ClipboardList className="h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
                {t("home.teacherRatings")}
              </p>
              <p className="mt-1 text-xl font-bold text-burgundy-700 dark:text-white">{ratingsCount}</p>
            </div>
          </div>

          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-zinc-100">
              <Award className="h-4 w-4 text-burgundy-700 dark:text-white" />
              {t("home.teacherAwards")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {awards.map((award) => (
                <span
                  key={award}
                  className="inline-flex rounded-full border border-burgundy-200 bg-burgundy-50 px-3 py-1 text-xs font-semibold text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-900/30 dark:text-white"
                >
                  {award}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



