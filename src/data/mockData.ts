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
    fullName: "Sardor Raxmatov",
    phone: "+998902222222",
    password: "teacher123",
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
  { id: "s_1", fullName: "Aziza Nurmatova", phone: "+998903000001", password: "student123", groupId: "g_101", points: 61.5 },
  { id: "s_2", fullName: "Bekzod Tursunov", phone: "+998903000002", password: "student123", groupId: "g_101", points: 54.25 },
  { id: "s_3", fullName: "Nargiza Saidova", phone: "+998903000003", password: "student123", groupId: "g_102", points: 49.5 },
  { id: "s_4", fullName: "Javlon Ikromov", phone: "+998903000004", password: "student123", groupId: "g_103", points: 39.75 },
  { id: "s_5", fullName: "Malika Usmonova", phone: "+998903000005", password: "student123", groupId: "g_104", points: 68 },
  { id: "s_6", fullName: "Murod Abduqodirov", phone: "+998903000006", password: "student123", groupId: "g_105", points: 57.5 },
  { id: "s_7", fullName: "Nilufar Olimova", phone: "+998903000007", password: "student123", groupId: "g_106", points: 52.25 },
  { id: "s_8", fullName: "Shoxrux Komilov", phone: "+998903000008", password: "student123", groupId: "g_201", points: 41 },
  { id: "s_9", fullName: "Shahnoza Ilhomova", phone: "+998903000009", password: "student123", groupId: "g_202", points: 72.5 },
  { id: "s_10", fullName: "Doston Qodirov", phone: "+998903000010", password: "student123", groupId: "g_203", points: 63.75 },
  { id: "s_11", fullName: "Sitora Axmedova", phone: "+998903000011", password: "student123", groupId: "g_204", points: 56.5 },
  { id: "s_12", fullName: "Bobur Xudoyorov", phone: "+998903000012", password: "student123", groupId: "g_205", points: 44.25 },
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
  ratingLogs: [
    {
      id: "log_1",
      teacherId: "t_1",
      studentId: "s_1",
      groupId: "g_101",
      delta: 5,
      label: "Полностью сделал",
      createdAt: new Date().toISOString(),
    },
    {
      id: "log_2",
      teacherId: "t_3",
      studentId: "s_9",
      groupId: "g_202",
      delta: 3.5,
      label: "Осталось 1 задание",
      createdAt: new Date().toISOString(),
    },
  ],
  session: null,
};
