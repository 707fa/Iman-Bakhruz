export type UserRole = "student" | "teacher";
export type GroupDaysPattern = "mwf" | "tts";

export interface Group {
  id: string;
  title: string;
  time: string;
  daysPattern: GroupDaysPattern;
  teacherId: string;
}

export interface Student {
  id: string;
  fullName: string;
  phone: string;
  password: string;
  groupId: string;
  avatarUrl?: string;
  points: number;
}

export interface Teacher {
  id: string;
  fullName: string;
  phone: string;
  password: string;
  groupIds: string[];
  avatarUrl?: string;
}

export interface RankingItem {
  studentId: string;
  fullName: string;
  groupId: string;
  points: number;
  avatarUrl?: string;
}

export interface RatingLog {
  id: string;
  teacherId: string;
  studentId: string;
  groupId: string;
  delta: number;
  label: string;
  createdAt: string;
}

export interface AuthSession {
  role: UserRole;
  userId: string;
}

export interface AppState {
  students: Student[];
  teachers: Teacher[];
  groups: Group[];
  rankings: RankingItem[];
  ratingLogs: RatingLog[];
  session: AuthSession | null;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  password: string;
  groupId: string;
  time: string;
  daysPattern: GroupDaysPattern;
}

export interface ActionResult {
  ok: boolean;
  messageKey: string;
  messageParams?: Record<string, string | number>;
}

export interface ScoreAction {
  value: number;
  label: string;
}
