export type UserRole = "student" | "teacher" | "parent";
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
  gameWins?: number;
  gamesPlayed?: number;
  gameBonusPoints?: number;
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
  parentInviteCode?: string;
  avatarUrl?: string;
  points: number;
  isActive?: boolean;
  isImanStudent?: boolean;
  isPaid?: boolean;
  paidUntil?: string;
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

export interface Parent {
  id: string;
  fullName: string;
  phone: string;
  password: string;
  childStudentIds: string[];
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
  isPaid?: boolean;
  paidUntil?: string;
}

export interface AppState {
  students: Student[];
  teachers: Teacher[];
  parents: Parent[];
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
  groupId?: string;
  groupTitle?: string;
  time?: string;
  daysPattern?: GroupDaysPattern;
  isImanStudent?: boolean;
}

export interface ParentRegisterPayload {
  fullName: string;
  phone: string;
  password: string;
  confirmPassword?: string;
  parentInviteCode: string;
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

export type SupportTicketSenderType = "student" | "teacher" | "support";

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderType: SupportTicketSenderType;
  text: string;
  source: "web" | "telegram" | string;
  readByStudentAt?: string;
  readBySupportAt?: string;
  createdAt: string;
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

export type HomeworkSubmissionStatus = "submitted" | "reviewed";

export interface HomeworkSubmission {
  id: string;
  taskId: string;
  studentId: string;
  studentName: string;
  studentGroupId?: string;
  answerText: string;
  status: HomeworkSubmissionStatus;
  teacherComment?: string;
  score?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HomeworkTask {
  id: string;
  teacherId: string;
  teacherName: string;
  groupId: string;
  groupTitle: string;
  taskType?: "homework" | "speaking";
  title: string;
  description: string;
  speakingTopic?: string;
  speakingLevel?: string;
  speakingQuestions?: string[];
  dueAt?: string;
  isActive: boolean;
  createdAt: string;
  mySubmission?: HomeworkSubmission;
}

export type PaymentProvider = "payme" | "click" | "manual";
export type PaymentStatus = "pending" | "paid" | "failed";
export type PaymentManualVerdict = "pending" | "likely_valid" | "likely_fake";

export interface PaymentTransaction {
  id: string;
  provider: PaymentProvider;
  amount: number;
  status: PaymentStatus;
  checkoutUrl?: string;
  receiptUrl?: string;
  manualVerdict?: PaymentManualVerdict;
  manualVerdictReason?: string;
  manualDetectedAmount?: number;
  manualReceiptUploadedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  paidAt?: string;
}

export interface SubscriptionState {
  isPaid: boolean;
  paidUntil?: string;
  required: boolean;
}

export type StudentAccessSource = "paid" | "top5" | "none";

export interface StudentAccessState {
  hasFullAccess: boolean;
  source: StudentAccessSource;
  paidUntil?: string;
}

export interface SpeakingQuestion {
  id: string;
  prompt: string;
  level: "beginner" | "elementary" | "pre-intermediate" | "intermediate";
  topic: string;
}

export interface SpeakingMistake {
  original: string;
  corrected: string;
  reason: string;
}

export interface SpeakingAnalysisResult {
  score: number;
  grammarScore: number;
  fluencyScore: number;
  vocabularyScore: number;
  transcript: string;
  correctedAnswer: string;
  mistakes: SpeakingMistake[];
  feedback: string;
  modelAnswer: string;
  levelEstimate: string;
}

export interface SpeakingAttemptHistoryItem {
  id: string;
  questionId: string;
  question: string;
  topic?: string;
  level?: SpeakingQuestion["level"];
  transcript: string;
  score: number;
  grammarScore?: number;
  fluencyScore?: number;
  vocabularyScore?: number;
  durationSec?: number;
  mode?: "daily" | "weekly_exam";
  createdAt: string;
}

export type SpeakingMistakeCategory = "grammar" | "vocabulary" | "pronunciation";

export interface SpeakingMistakeBankItem {
  id: string;
  questionId: string;
  topic: string;
  level: SpeakingQuestion["level"];
  category: SpeakingMistakeCategory;
  original: string;
  corrected: string;
  reason: string;
  createdAt: string;
}

export interface SpeakingDailyProgress {
  dateKey: string;
  completedQuestionIds: string[];
  reminderShownDateKey?: string;
}

export interface SpeakingWeeklyExamProgress {
  weekKey: string;
  questionIds: string[];
  completedQuestionIds: string[];
  started?: boolean;
  promptShownWeekKey?: string;
}

export interface SpeakingSessionSnapshot {
  attempts: SpeakingAttemptHistoryItem[];
  mistakes: SpeakingMistakeBankItem[];
  daily: SpeakingDailyProgress;
  weeklyExam: SpeakingWeeklyExamProgress;
}
