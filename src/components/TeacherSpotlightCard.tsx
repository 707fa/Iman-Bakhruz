import { Award, BookOpenCheck, ClipboardList, Users2 } from "lucide-react";
import { useMemo } from "react";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { UserAvatar } from "./UserAvatar";

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
    <section className="rounded-[1.8rem] border border-zinc-200/80 bg-white p-4 text-charcoal shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-5 dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_right,rgba(111,0,0,0.16),transparent_42%),linear-gradient(145deg,#15090f,#110c11_52%,#0a0b0f)] dark:text-white dark:shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
      <div className="border-b border-zinc-200 pb-4 dark:border-white/10">
        <p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-white/60">{t("home.teacherInfoTitle")}</p>
        <p className="mt-1 text-sm text-charcoal/75 dark:text-white/80">{t("home.teacherInfoSubtitle")}</p>
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-3">
          <UserAvatar fullName={teacher.fullName} avatarUrl={teacher.avatarUrl} />
          <div>
            <p className="text-base font-semibold">{teacher.fullName}</p>
            <p className="text-xs text-charcoal/60 dark:text-white/60">{t("role.teacher")}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200/70 bg-white/90 p-3 dark:border-zinc-800 dark:bg-black/30">
            <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-charcoal/60 dark:text-white/65">
              <BookOpenCheck className="h-3.5 w-3.5 text-burgundy-700 dark:text-white" />
              {t("home.teacherGroups")}
            </p>
            <p className="mt-1 text-xl font-bold">{teacherGroups.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/70 bg-white/90 p-3 dark:border-zinc-800 dark:bg-black/30">
            <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-charcoal/60 dark:text-white/65">
              <Users2 className="h-3.5 w-3.5 text-burgundy-700 dark:text-white" />
              {t("home.teacherStudents")}
            </p>
            <p className="mt-1 text-xl font-bold">{teacherStudents.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/70 bg-white/90 p-3 dark:border-zinc-800 dark:bg-black/30">
            <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-charcoal/60 dark:text-white/65">
              <ClipboardList className="h-3.5 w-3.5 text-burgundy-700 dark:text-white" />
              {t("home.teacherRatings")}
            </p>
            <p className="mt-1 text-xl font-bold">{ratingsCount}</p>
          </div>
        </div>

        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <Award className="h-4 w-4 text-burgundy-700 dark:text-white" />
            {t("home.teacherAwards")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {awards.map((award) => (
              <span key={award} className="inline-flex rounded-full bg-burgundy-100 px-3 py-1 text-xs font-semibold text-burgundy-800 dark:bg-white/15 dark:text-white">
                {award}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}



