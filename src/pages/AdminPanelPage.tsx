import { Plus, Save, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAppStore } from "../hooks/useAppStore";
import type { GroupDaysPattern } from "../types";

const dayOptions: Array<{ value: GroupDaysPattern; label: string }> = [
  { value: "mwf", label: "Du/Ch/Ju" },
  { value: "tts", label: "Se/Pa/Sh" },
];

function todayTime(): string {
  return "14:00";
}

export function AdminPanelPage() {
  const {
    state,
    adminCreateGroup,
    adminUpdateGroup,
    adminDeleteGroup,
    adminCreateStudent,
    adminUpdateStudent,
    adminDeleteStudent,
    adminCreateTeacher,
    adminUpdateTeacher,
    adminDeleteTeacher,
  } = useAppStore();
  const [groupDraft, setGroupDraft] = useState({ title: "", time: todayTime(), daysPattern: "mwf" as GroupDaysPattern });
  const [studentDraft, setStudentDraft] = useState({ fullName: "", phone: "", password: "", groupId: state.groups[0]?.id ?? "" });
  const [teacherDraft, setTeacherDraft] = useState({ fullName: "", phone: "", password: "" });
  const [studentQuery, setStudentQuery] = useState("");

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return state.students;
    return state.students.filter((student) =>
      [student.fullName, student.phone, state.groups.find((group) => group.id === student.groupId)?.title ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [state.groups, state.students, studentQuery]);

  function createGroup() {
    const result = adminCreateGroup(groupDraft);
    if (result.ok) {
      setGroupDraft({ title: "", time: todayTime(), daysPattern: "mwf" });
    }
  }

  function createStudent() {
    const result = adminCreateStudent(studentDraft);
    if (result.ok) {
      setStudentDraft({ fullName: "", phone: "", password: "", groupId: state.groups[0]?.id ?? "" });
    }
  }

  function createTeacher() {
    const result = adminCreateTeacher(teacherDraft);
    if (result.ok) {
      setTeacherDraft({ fullName: "", phone: "", password: "" });
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Admin panel"
        subtitle="Guruhlar, o'quvchilar, o'qituvchilar va access boshqaruvi."
        action={<Badge variant="soft">{state.students.length} users</Badge>}
      />

      <section className="grid gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">Groups</p>
          <p className="mt-2 text-2xl font-bold">{state.groups.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">Students</p>
          <p className="mt-2 text-2xl font-bold">{state.students.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">Teachers</p>
          <p className="mt-2 text-2xl font-bold">{state.teachers.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/50 dark:text-zinc-500">Active paid</p>
          <p className="mt-2 text-2xl font-bold">{state.students.filter((student) => student.isPaid).length}</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Groups</h2>
                <p className="text-sm text-charcoal/55 dark:text-zinc-400">Nomi, vaqti va kunlari.</p>
              </div>
              <Badge variant="positive">{state.groups.length}</Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_120px_120px_auto]">
              <Input placeholder="Group name" value={groupDraft.title} onChange={(event) => setGroupDraft((prev) => ({ ...prev, title: event.target.value }))} />
              <Input placeholder="14:00" value={groupDraft.time} onChange={(event) => setGroupDraft((prev) => ({ ...prev, time: event.target.value }))} />
              <Select value={groupDraft.daysPattern} onValueChange={(value) => setGroupDraft((prev) => ({ ...prev, daysPattern: value as GroupDaysPattern }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={createGroup}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {state.groups.map((group) => (
                <div key={group.id} className="grid gap-2 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-[1fr_120px_120px_auto]">
                  <Input value={group.title} onChange={(event) => adminUpdateGroup(group.id, { title: event.target.value })} />
                  <Input value={group.time} onChange={(event) => adminUpdateGroup(group.id, { time: event.target.value })} />
                  <Select value={group.daysPattern} onValueChange={(value) => adminUpdateGroup(group.id, { daysPattern: value as GroupDaysPattern })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="destructive" onClick={() => adminDeleteGroup(group.id)} aria-label="Delete group">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Teachers</h2>
                <p className="text-sm text-charcoal/55 dark:text-zinc-400">O'qituvchi loginlari.</p>
              </div>
              <Badge variant="positive">{state.teachers.length}</Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_150px_120px_auto]">
              <Input placeholder="Full name" value={teacherDraft.fullName} onChange={(event) => setTeacherDraft((prev) => ({ ...prev, fullName: event.target.value }))} />
              <Input placeholder="Phone" value={teacherDraft.phone} onChange={(event) => setTeacherDraft((prev) => ({ ...prev, phone: event.target.value }))} />
              <Input placeholder="Password" value={teacherDraft.password} onChange={(event) => setTeacherDraft((prev) => ({ ...prev, password: event.target.value }))} />
              <Button type="button" onClick={createTeacher}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {state.teachers.map((teacher) => (
                <div key={teacher.id} className="grid gap-2 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-[1fr_150px_120px_auto]">
                  <Input value={teacher.fullName} onChange={(event) => adminUpdateTeacher(teacher.id, { fullName: event.target.value })} />
                  <Input value={teacher.phone} onChange={(event) => adminUpdateTeacher(teacher.id, { phone: event.target.value })} />
                  <Input value={teacher.password} onChange={(event) => adminUpdateTeacher(teacher.id, { password: event.target.value })} />
                  <Button type="button" variant="destructive" onClick={() => adminDeleteTeacher(teacher.id)} aria-label="Delete teacher">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">Students</h2>
              <p className="text-sm text-charcoal/55 dark:text-zinc-400">Guruh, aktivlik va pullik access.</p>
            </div>
            <Input className="lg:max-w-xs" placeholder="Search student" value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} />
          </div>

          <div className="grid gap-2 lg:grid-cols-[1fr_150px_120px_180px_auto]">
            <Input placeholder="Full name" value={studentDraft.fullName} onChange={(event) => setStudentDraft((prev) => ({ ...prev, fullName: event.target.value }))} />
            <Input placeholder="Phone" value={studentDraft.phone} onChange={(event) => setStudentDraft((prev) => ({ ...prev, phone: event.target.value }))} />
            <Input placeholder="Password" value={studentDraft.password} onChange={(event) => setStudentDraft((prev) => ({ ...prev, password: event.target.value }))} />
            <Select value={studentDraft.groupId || "none"} onValueChange={(value) => setStudentDraft((prev) => ({ ...prev, groupId: value === "none" ? "" : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No group</SelectItem>
                {state.groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={createStudent}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[920px] space-y-2">
              {filteredStudents.map((student) => (
                <div key={student.id} className="grid grid-cols-[1.35fr_150px_120px_180px_96px_96px_48px] items-center gap-2 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <Input value={student.fullName} onChange={(event) => adminUpdateStudent(student.id, { fullName: event.target.value })} />
                  <Input value={student.phone} onChange={(event) => adminUpdateStudent(student.id, { phone: event.target.value })} />
                  <Input value={student.password} onChange={(event) => adminUpdateStudent(student.id, { password: event.target.value })} />
                  <Select value={student.groupId || "none"} onValueChange={(value) => adminUpdateStudent(student.id, { groupId: value === "none" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No group</SelectItem>
                      {state.groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant={student.isActive === false ? "destructive" : "positive"} onClick={() => adminUpdateStudent(student.id, { isActive: student.isActive === false })}>
                    {student.isActive === false ? "Off" : "On"}
                  </Button>
                  <Button type="button" variant={student.isPaid ? "positive" : "secondary"} onClick={() => adminUpdateStudent(student.id, { isPaid: !student.isPaid })}>
                    {student.isPaid ? "Paid" : "Free"}
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => adminDeleteStudent(student.id)} aria-label="Delete student">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-burgundy-50 p-3 text-xs font-semibold text-burgundy-800 dark:bg-burgundy-900/30 dark:text-burgundy-100">
            <Save className="h-4 w-4" />
            Changes are saved in the site state immediately.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
