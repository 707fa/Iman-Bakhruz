export type UserRole = "student" | "teacher";
export type GroupDaysPattern = "mwf" | "tts";
export type StatusBadge = "red" | "yellow" | "green";

export interface ProgressSnapshot {
  status: StatusBadge;
  grammar: number;
  vocabulary: number;
  homework: number;
  speaking: number;
  attendance: number;
  weeklyXp: number;
  level: number;
  streakDays: number;
}

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
  isActive?: boolean;
  isImanStudent?: boolean;
  statusBadge?: StatusBadge;
  progress?: ProgressSnapshot;
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
  statusBadge?: StatusBadge;
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
  confirmPassword?: string;
  groupId: string;
  groupTitle?: string;
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

export interface GrammarTopic {
  id: string;
  title: string;
  description: string;
  level: string;
  pptUrl: string;
  isActive: boolean;
  createdByName?: string;
  createdAt: string;
}

export type SupportTicketStatus = "open" | "in_progress" | "closed";

export interface SupportTicket {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  message: string;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  imageUrl?: string;
  createdAt: string;
}

export interface FriendlyChatPeer {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface FriendlyConversation {
  id: string;
  updatedAt: string;
  peer: FriendlyChatPeer;
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
  };
}

export interface FriendlyChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  createdAt: string;
}
