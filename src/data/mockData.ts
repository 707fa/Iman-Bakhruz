import type { AppState, Group } from "../types";

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

export const initialState: AppState = {
  students: [],
  teachers: [],
  parents: [],
  groups,
  rankings: [],
  ratingLogs: [],
  session: null,
};
