import { CalendarDays, ChevronLeft, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { UserAvatar } from "../components/UserAvatar";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { hasTeacherGroupAccess } from "../lib/teacherGroups";
import { markAttendance, getAttendanceForDate, getDistinctAttendanceDates, getStudentAttendanceRate } from "../lib/attendance";
import type { AttendanceStatus } from "../types";

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string; color: string }> = [
  { value: "present", label: "Present", color: "bg-green-500" },
  { value: "late", label: "Late", color: "bg-yellow-500" },
  { value: "absent", label: "Absent", color: "bg-red-500" },
  { value: "excused", label: "Excused", color: "bg-blue-500" },
];

export function TeacherAttendancePage() {
  const { id } = useParams();
  const { state, currentTeacher } = useAppStore();
  const { t } = useUi();
  const { showToast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  if (!currentTeacher) return null;

  const group = state.groups.find((entry) => entry.id === id);
  const hasAccess = !!group && hasTeacherGroupAccess(state, currentTeacher, group.id);

  const students = hasAccess
    ? state.students
        .filter((student) => student.groupId === group!.id && student.isActive !== false && student.isImanStudent !== false)
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
    : [];

  const existingRecords = useMemo(() => getAttendanceForDate(group?.id ?? "", selectedDate), [group?.id, selectedDate]);
  const distinctDates = useMemo(() => (group ? getDistinctAttendanceDates(group.id) : []), [group]);

  const attendanceRates = useMemo(() => {
    const rates: Record<string, number> = {};
    if (!group) return rates;
    for (const student of students) {
      rates[student.id] = getStudentAttendanceRate(student.id, group.id);
    }
    return rates;
  }, [group, students]);

  useMemo(() => {
    const initial: Record<string, AttendanceStatus> = {};
    for (const rec of existingRecords) {
      initial[rec.studentId] = rec.status;
    }
    for (const student of students) {
      if (!initial[student.id]) {
        initial[student.id] = "present";
      }
    }
    setStatusMap(initial);
  }, [existingRecords, students]);

  async function handleSave() {
    if (!group || !currentTeacher) return;

    setSaving(true);
    try {
      const entries = students.map((student) => ({
        studentId: student.id,
        status: statusMap[student.id] ?? "present",
      }));
      markAttendance(group.id, currentTeacher.id, selectedDate, entries);
      showToast({ tone: "success", message: `Attendance saved for ${selectedDate}` });
    } catch {
      showToast({ tone: "error", message: "Failed to save attendance." });
    } finally {
      setSaving(false);
    }
  }

  function handleSetStatus(studentId: string, status: AttendanceStatus) {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  }

  const presentCount = students.filter((s) => statusMap[s.id] === "present").length;
  const lateCount = students.filter((s) => statusMap[s.id] === "late").length;
  const absentCount = students.filter((s) => statusMap[s.id] === "absent").length;
  const excusedCount = students.filter((s) => statusMap[s.id] === "excused").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/teacher/groups">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("teacher.backToGroups")}
          </Button>
        </Link>
      </div>

      <PageHeader
        title={group ? `Attendance — ${group.title}` : "Attendance"}
        subtitle={group ? "Mark attendance for your students" : "Select a group"}
        action={group ? <Badge variant="soft">{group.time}</Badge> : undefined}
      />

      {group && !hasAccess ? (
        <Card>
          <CardContent className="p-6 text-sm text-burgundy-700 dark:text-white">{t("teacher.noAccessGroup")}</CardContent>
        </Card>
      ) : null}

      {hasAccess ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/55 dark:text-zinc-400">Present</p>
                <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{presentCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/55 dark:text-zinc-400">Late</p>
                <p className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">{lateCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/55 dark:text-zinc-400">Absent</p>
                <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{absentCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/55 dark:text-zinc-400">Excused</p>
                <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{excusedCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Date</label>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setSelectedDate(today)}>
                    <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                    Today
                  </Button>
                  {distinctDates.slice(0, 5).map((date) => (
                    <Button key={date} size="sm" variant="ghost" onClick={() => setSelectedDate(date)} className={date === selectedDate ? "bg-burgundy-50 dark:bg-burgundy-900/30" : ""}>
                      {date}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {students.map((student) => {
                  const currentStatus = statusMap[student.id] ?? "present";
                  const rate = attendanceRates[student.id];
                  return (
                    <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-burgundy-100 p-3 dark:border-zinc-700">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar fullName={student.fullName} avatarUrl={student.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-charcoal dark:text-zinc-100">{student.fullName}</p>
                          <p className="text-xs text-charcoal/60 dark:text-zinc-400">
                            Attendance: {rate}%
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSetStatus(student.id, opt.value)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                              currentStatus === opt.value
                                ? `${opt.color} text-white shadow-sm`
                                : "border border-burgundy-100 bg-white text-charcoal/70 hover:border-burgundy-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {students.length === 0 ? (
                  <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    No students in this group.
                  </p>
                ) : null}
              </div>

              <Button onClick={() => void handleSave()} disabled={saving} className="w-full sm:w-auto">
                {saving ? "Saving..." : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Attendance
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
