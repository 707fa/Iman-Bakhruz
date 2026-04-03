import type { AppState, Group, RankingItem, Student, Teacher } from "../types";

export const groups: Group[] = [
  { id: "g_101", title: "Pre-Intermediate Intensive", time: "09:00", daysPattern: "mwf", teacherId: "t_3" },
  { id: "g_102", title: "Pre-Intermediate", time: "10:30", daysPattern: "mwf", teacherId: "t_3" },
  { id: "g_103", title: "Elementary", time: "14:00", daysPattern: "mwf", teacherId: "t_3" },
  { id: "g_104", title: "Beginner", time: "15:30", daysPattern: "mwf", teacherId: "t_3" },
  { id: "g_105", title: "Upper-Intermediate", time: "17:00", daysPattern: "mwf", teacherId: "t_3" },
  { id: "g_106", title: "Elementary", time: "18:30", daysPattern: "mwf", teacherId: "t_3" },
  { id: "g_201", title: "Intermediate", time: "09:00", daysPattern: "tts", teacherId: "t_3" },
  { id: "g_202", title: "Pre-Intermediate", time: "14:00", daysPattern: "tts", teacherId: "t_3" },
  { id: "g_203", title: "Intermediate", time: "15:30", daysPattern: "tts", teacherId: "t_3" },
  { id: "g_204", title: "Beginner", time: "17:00", daysPattern: "tts", teacherId: "t_3" },
  { id: "g_205", title: "Upper-Intermediate", time: "18:30", daysPattern: "tts", teacherId: "t_3" },
];

export const teachers: Teacher[] = [
  {
    id: "t_1",
    fullName: "Dilnoza Karimova",
    phone: "+998901111111",
    password: "teacher123",
    groupIds: ["g_101", "g_102", "g_103", "g_201", "g_202"],
  },
  {
    id: "t_2",
    fullName: "Фаррух Ахроров",
    phone: "+998978778177",
    password: "alex2024",
    groupIds: ["g_104", "g_105", "g_106", "g_203", "g_204", "g_205"],
  },
  {
    id: "t_3",
    fullName: "Bekhruz Iman",
    phone: "+998909788255",
    password: "909788255@@",
    groupIds: ["g_101", "g_102", "g_103", "g_104", "g_105", "g_106", "g_201", "g_202", "g_203", "g_204", "g_205"],
  },
];

export const students: Student[] = [
  {
    id: "s_1",
    fullName: "Фаррух Ахроров",
    phone: "+998978778177",
    password: "alex2024m",
    groupId: "g_101",
    points: 0,
  },
];

export const rankings: RankingItem[] = students.map((student) => ({
  studentId: student.id,
  fullName: student.fullName,
  groupId: student.groupId,
  points: student.points,
  avatarUrl: student.avatarUrl,
}));

export const initialState: AppState = {
  students,
  teachers,
  groups,
  rankings,
  ratingLogs: [],
  session: null,
};
