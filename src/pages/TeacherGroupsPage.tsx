import { useMemo, useState } from "react";
import { GroupCard } from "../components/GroupCard";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { useAppStore } from "../hooks/useAppStore";
import { getTeacherAccessibleGroups } from "../lib/teacherGroups";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { motion } from "framer-motion";
import { LayoutGrid, Users, GraduationCap } from "lucide-react";

export function TeacherGroupsPage() {
  const { state, currentTeacher, renameGroup } = useAppStore();
  const { showToast } = useToast();
  const { t } = useUi();
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);

  const teacherGroups = useMemo(
    () => (currentTeacher ? getTeacherAccessibleGroups(state, currentTeacher) : []),
    [state, currentTeacher],
  );

  const totalStudents = useMemo(() => {
    const groupIds = new Set(teacherGroups.map(g => g.id));
    return state.students.filter(s => groupIds.has(s.groupId)).length;
  }, [state.students, teacherGroups]);

  if (!currentTeacher) return null;

  async function handleRename(groupId: string, nextTitle: string) {
    if (savingGroupId || !nextTitle.trim() || nextTitle.trim().length < 2) return;
    setSavingGroupId(groupId);
    try {
      const result = await renameGroup(groupId, nextTitle.trim());
      showToast({
        tone: result.ok ? "success" : "error",
        message: t(result.messageKey, result.messageParams),
      });
    } finally {
      setSavingGroupId(null);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title={t("nav.teacherGroups")}
        subtitle={t("teacher.subtitle")}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="soft" className="h-8 rounded-lg px-3">
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              {teacherGroups.length} {t("teacher.groups")}
            </Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="rounded-3xl border border-burgundy-100 bg-white/50 p-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/50"
         >
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm font-medium text-charcoal/50 dark:text-zinc-400">{t("landing.students")}</p>
               <h4 className="mt-1 text-3xl font-bold text-charcoal dark:text-white">{totalStudents}</h4>
             </div>
             <div className="rounded-2xl bg-burgundy-50 p-3 dark:bg-burgundy-900/30">
               <Users className="h-6 w-6 text-burgundy-700 dark:text-burgundy-200" />
             </div>
           </div>
         </motion.div>

         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="rounded-3xl border border-burgundy-100 bg-white/50 p-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/50"
         >
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm font-medium text-charcoal/50 dark:text-zinc-400">{t("teacher.groups")}</p>
               <h4 className="mt-1 text-3xl font-bold text-charcoal dark:text-white">{teacherGroups.length}</h4>
             </div>
             <div className="rounded-2xl bg-burgundy-50 p-3 dark:bg-burgundy-900/30">
               <GraduationCap className="h-6 w-6 text-burgundy-700 dark:text-burgundy-200" />
             </div>
           </div>
         </motion.div>
      </div>

      {teacherGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-burgundy-200 bg-white/30 py-20 dark:border-zinc-800 dark:bg-zinc-950/30">
          <p className="text-sm text-charcoal/50 dark:text-zinc-400">{t("ui.noData")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {teacherGroups.map((group, idx) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 + 0.2 }}
            >
              <GroupCard
                group={group}
                students={state.students.filter((student) => student.groupId === group.id)}
                isSaving={savingGroupId === group.id}
                onRename={(nextTitle) => void handleRename(group.id, nextTitle)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
