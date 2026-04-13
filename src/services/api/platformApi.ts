import type {
  AiChatMessage,
  AppState,
  FriendlyChatMessage,
  FriendlyConversation,
  GrammarTopic,
  Group,
  HomeworkSubmission,
  HomeworkTask,
  LoginPayload,
  ProgressSnapshot,
  RankingItem,
  RatingLog,
  RegisterPayload,
  ScoreAction,
  SubscriptionState,
  Student,
  PaymentProvider,
  PaymentTransaction,
  SupportTicket,
  SupportTicketStatus,
  Teacher,
  UserRole,
} from "../../types";
import { apiRequest } from "./http";

export interface AuthResponse {
  token: string;
  role: UserRole;
  userId: string;
  subscription?: SubscriptionState;
}

export interface RemoteStatePayload {
  students: Student[];
  teachers: Teacher[];
  groups: Group[];
  rankings: RankingItem[];
  ratingLogs: RatingLog[];
  subscription?: SubscriptionState;
}

export interface UserProfilePayload {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
  groupId: string;
  groupTitle?: string;
  points: number;
  avatarUrl?: string;
  progress?: ProgressSnapshot;
}

export interface TeacherManualPaymentRequest {
  transaction: PaymentTransaction;
  student: {
    id: string;
    fullName: string;
    phone: string;
    groupId?: string;
    groupTitle?: string;
    groupTime?: string;
  };
}

export interface ProgressResponse extends ProgressSnapshot {
  userId: string;
  role?: UserRole;
  fullName?: string;
  groupId?: string;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function getDataObject(payload: unknown): UnknownRecord | null {
  const root = asRecord(payload);
  if (!root) return null;
  const nested = asRecord(root.data);
  return nested ?? root;
}

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRole(value: unknown): UserRole {
  return value === "teacher" ? "teacher" : "student";
}

function normalizeStatus(value: unknown): ProgressSnapshot["status"] {
  if (value === "red" || value === "yellow" || value === "green") {
    return value;
  }
  return "yellow";
}

function normalizeProgress(source: UnknownRecord | null): ProgressSnapshot | undefined {
  if (!source) return undefined;

  const maybeHasProgress =
    source.status !== undefined ||
    source.status_badge !== undefined ||
    source.grammar !== undefined ||
    source.progress_grammar !== undefined;
  if (!maybeHasProgress) return undefined;

  return {
    status: normalizeStatus(source.status ?? source.status_badge),
    grammar: num(source.grammar ?? source.progress_grammar),
    vocabulary: num(source.vocabulary ?? source.progress_vocabulary),
    homework: num(source.homework ?? source.progress_homework),
    speaking: num(source.speaking ?? source.progress_speaking),
    attendance: num(source.attendance ?? source.progress_attendance),
    weeklyXp: num(source.weeklyXp ?? source.weekly_xp),
    level: num(source.level, 1),
    streakDays: num(source.streakDays ?? source.streak_days),
  };
}

function normalizeStudent(raw: unknown): Student | null {
  const item = asRecord(raw);
  if (!item) return null;
  const progress = normalizeProgress(asRecord(item.progress) ?? item);
  return {
    id: str(item.id),
    fullName: str(item.fullName ?? item.full_name),
    phone: str(item.phone),
    password: str(item.password),
    groupId: str(item.groupId ?? item.group_id),
    avatarUrl: str(item.avatarUrl ?? item.avatar) || undefined,
    points: num(item.points),
    isActive: item.isActive !== undefined ? Boolean(item.isActive) : item.is_active !== undefined ? Boolean(item.is_active) : undefined,
    isImanStudent:
      item.isImanStudent !== undefined ? Boolean(item.isImanStudent) : item.is_iman_student !== undefined ? Boolean(item.is_iman_student) : undefined,
    isPaid: item.isPaid !== undefined ? Boolean(item.isPaid) : item.is_paid !== undefined ? Boolean(item.is_paid) : undefined,
    paidUntil: str(item.paidUntil ?? item.paid_until) || undefined,
    statusBadge: progress?.status ?? normalizeStatus(item.statusBadge ?? item.status_badge),
    progress,
  };
}

function normalizeSubscription(raw: unknown): SubscriptionState | undefined {
  const item = asRecord(raw);
  if (!item) return undefined;
  return {
    isPaid: Boolean(item.isPaid ?? item.is_paid),
    paidUntil: str(item.paidUntil ?? item.paid_until) || undefined,
    required: Boolean(item.required),
  };
}

function normalizePaymentTransaction(raw: unknown): PaymentTransaction | null {
  const item = asRecord(raw);
  if (!item) return null;
  const providerRaw = str(item.provider);
  const provider: PaymentTransaction["provider"] =
    providerRaw === "click" ? "click" : providerRaw === "manual" ? "manual" : "payme";
  const statusRaw = str(item.status);
  const status: PaymentTransaction["status"] =
    statusRaw === "paid" || statusRaw === "failed" ? statusRaw : "pending";

  return {
    id: str(item.id),
    provider,
    amount: num(item.amount),
    status,
    checkoutUrl: str(item.checkoutUrl ?? item.checkout_url) || undefined,
    createdAt: str(item.createdAt ?? item.created_at),
    paidAt: str(item.paidAt ?? item.paid_at) || undefined,
  };
}

function normalizeTeacherManualPaymentRequest(raw: unknown): TeacherManualPaymentRequest | null {
  const item = asRecord(raw);
  if (!item) return null;
  const transaction = normalizePaymentTransaction(item.transaction);
  const student = asRecord(item.student);
  if (!transaction || !student) return null;

  return {
    transaction,
    student: {
      id: str(student.id),
      fullName: str(student.fullName ?? student.full_name),
      phone: str(student.phone),
      groupId: str(student.groupId ?? student.group_id) || undefined,
      groupTitle: str(student.groupTitle ?? student.group_title) || undefined,
      groupTime: str(student.groupTime ?? student.group_time) || undefined,
    },
  };
}

function normalizeTeacher(raw: unknown): Teacher | null {
  const item = asRecord(raw);
  if (!item) return null;
  const groupIds = readArray<unknown>(item.groupIds ?? item.group_ids).map((entry) => str(entry)).filter(Boolean);
  return {
    id: str(item.id),
    fullName: str(item.fullName ?? item.full_name),
    phone: str(item.phone),
    password: str(item.password),
    groupIds,
    avatarUrl: str(item.avatarUrl ?? item.avatar) || undefined,
  };
}

function normalizeGroup(raw: unknown): Group | null {
  const item = asRecord(raw);
  if (!item) return null;
  const days = str(item.daysPattern ?? item.days_pattern);
  const daysPattern: Group["daysPattern"] = days === "tts" ? "tts" : "mwf";
  return {
    id: str(item.id),
    title: str(item.title),
    time: str(item.time),
    daysPattern,
    teacherId: str(item.teacherId ?? item.teacher_id),
  };
}

function normalizeRanking(raw: unknown): RankingItem | null {
  const item = asRecord(raw);
  if (!item) return null;
  const statusBadge = item.statusBadge ?? item.status_badge;
  return {
    studentId: str(item.studentId ?? item.student_id),
    fullName: str(item.fullName ?? item.full_name),
    groupId: str(item.groupId ?? item.group_id),
    points: num(item.points),
    avatarUrl: str(item.avatarUrl ?? item.avatar) || undefined,
    statusBadge: normalizeStatus(statusBadge),
  };
}

function normalizeRatingLog(raw: unknown): RatingLog | null {
  const item = asRecord(raw);
  if (!item) return null;
  return {
    id: str(item.id),
    teacherId: str(item.teacherId ?? item.teacher_id),
    studentId: str(item.studentId ?? item.student_id),
    groupId: str(item.groupId ?? item.group_id),
    delta: num(item.delta),
    label: str(item.label),
    createdAt: str(item.createdAt ?? item.created_at),
  };
}

function normalizeAuthResponse(payload: unknown): AuthResponse {
  const data = getDataObject(payload);
  if (!data) {
    throw new Error("Invalid auth response");
  }

  const user = asRecord(data.user);
  const token = data.token ?? data.accessToken;
  const role = normalizeRole(data.role ?? user?.role);
  const userId = data.userId ?? user?.id;

  if (!token || !userId) {
    throw new Error("Invalid auth response");
  }

  return {
    token: str(token),
    role,
    userId: str(userId),
    subscription: normalizeSubscription(data.subscription),
  };
}

function normalizeStatePayload(payload: unknown): RemoteStatePayload {
  const data = getDataObject(payload);
  if (!data) {
    return {
      students: [],
      teachers: [],
      groups: [],
      rankings: [],
      ratingLogs: [],
    };
  }

  return {
    students: readArray<unknown>(data.students).map(normalizeStudent).filter((item): item is Student => item !== null),
    teachers: readArray<unknown>(data.teachers).map(normalizeTeacher).filter((item): item is Teacher => item !== null),
    groups: readArray<unknown>(data.groups).map(normalizeGroup).filter((item): item is Group => item !== null),
    rankings: readArray<unknown>(data.rankings).map(normalizeRanking).filter((item): item is RankingItem => item !== null),
    ratingLogs: readArray<unknown>(data.ratingLogs).map(normalizeRatingLog).filter((item): item is RatingLog => item !== null),
    subscription: normalizeSubscription(data.subscription),
  };
}

function normalizeProfilePayload(payload: unknown): UserProfilePayload {
  const data = getDataObject(payload);
  if (!data) {
    throw new Error("Invalid profile response");
  }

  const progress = normalizeProgress(data);

  return {
    id: str(data.id),
    fullName: str(data.fullName ?? data.full_name),
    phone: str(data.phone),
    role: normalizeRole(data.role),
    groupId: str(data.group ?? data.groupId ?? data.group_id),
    groupTitle: str(data.groupTitle ?? data.group_title) || undefined,
    points: num(data.points),
    avatarUrl: str(data.avatarUrl ?? data.avatar) || undefined,
    progress,
  };
}

function normalizeProgressPayload(payload: unknown): ProgressResponse {
  const data = getDataObject(payload);
  if (!data) {
    throw new Error("Invalid progress response");
  }
  const progress = normalizeProgress(data);
  if (!progress) {
    throw new Error("Invalid progress response");
  }

  return {
    userId: str(data.userId ?? data.user_id),
    role: data.role ? normalizeRole(data.role) : undefined,
    fullName: str(data.fullName ?? data.full_name) || undefined,
    groupId: str(data.groupId ?? data.group_id) || undefined,
    ...progress,
  };
}

function normalizeGrammarTopic(raw: unknown): GrammarTopic | null {
  const item = asRecord(raw);
  if (!item) return null;
  return {
    id: str(item.id),
    title: str(item.title),
    description: str(item.description),
    level: str(item.level),
    pptUrl: str(item.pptUrl ?? item.ppt_url),
    isActive: Boolean(item.isActive ?? item.is_active),
    createdByName: str(item.createdByName ?? item.created_by_name) || undefined,
    createdAt: str(item.createdAt ?? item.created_at),
  };
}

function normalizeSupportTicket(raw: unknown): SupportTicket | null {
  const item = asRecord(raw);
  if (!item) return null;
  const statusValue = str(item.status) as SupportTicketStatus;
  const status: SupportTicketStatus =
    statusValue === "in_progress" || statusValue === "closed" ? statusValue : "open";
  return {
    id: str(item.id),
    studentId: str(item.student ?? item.student_id),
    studentName: str(item.studentName ?? item.student_name),
    teacherId: str(item.teacher ?? item.teacher_id),
    teacherName: str(item.teacherName ?? item.teacher_name),
    message: str(item.message),
    status,
    createdAt: str(item.createdAt ?? item.created_at),
    updatedAt: str(item.updatedAt ?? item.updated_at),
  };
}

function normalizeAiChatMessage(raw: unknown): AiChatMessage | null {
  const item = asRecord(raw);
  if (!item) return null;
  const role = str(item.role) === "assistant" ? "assistant" : "user";
  return {
    id: str(item.id),
    role,
    text: str(item.text),
    imageUrl: str(item.imageUrl ?? item.image_url) || undefined,
    createdAt: str(item.createdAt ?? item.created_at),
  };
}

function normalizeFriendlyConversation(raw: unknown): FriendlyConversation | null {
  const item = asRecord(raw);
  if (!item) return null;
  const peer = asRecord(item.peer);
  if (!peer) return null;
  const last = asRecord(item.lastMessage ?? item.last_message);
  return {
    id: str(item.id),
    updatedAt: str(item.updatedAt ?? item.updated_at),
    peer: {
      id: str(peer.id),
      fullName: str(peer.fullName ?? peer.full_name),
      role: normalizeRole(peer.role),
      avatarUrl: str(peer.avatarUrl ?? peer.avatar) || undefined,
    },
    lastMessage: last
      ? {
          id: str(last.id),
          text: str(last.text),
          senderId: str(last.senderId ?? last.sender_id),
          createdAt: str(last.createdAt ?? last.created_at),
        }
      : undefined,
  };
}

function normalizeFriendlyMessage(raw: unknown): FriendlyChatMessage | null {
  const item = asRecord(raw);
  if (!item) return null;
  return {
    id: str(item.id),
    senderId: str(item.senderId ?? item.sender_id),
    senderName: str(item.senderName ?? item.sender_name),
    senderRole: normalizeRole(item.senderRole ?? item.sender_role),
    text: str(item.text),
    createdAt: str(item.createdAt ?? item.created_at),
  };
}

function normalizeHomeworkSubmission(raw: unknown): HomeworkSubmission | null {
  const item = asRecord(raw);
  if (!item) return null;
  const status = str(item.status) === "reviewed" ? "reviewed" : "submitted";
  return {
    id: str(item.id),
    taskId: str(item.taskId ?? item.task_id),
    studentId: str(item.studentId ?? item.student_id),
    studentName: str(item.studentName ?? item.student_name),
    studentGroupId: str(item.studentGroupId ?? item.student_group_id) || undefined,
    answerText: str(item.answerText ?? item.answer_text),
    status,
    teacherComment: str(item.teacherComment ?? item.teacher_comment) || undefined,
    score: item.score === null || item.score === undefined ? undefined : num(item.score),
    createdAt: str(item.createdAt ?? item.created_at),
    updatedAt: str(item.updatedAt ?? item.updated_at),
  };
}

function normalizeHomeworkTask(raw: unknown): HomeworkTask | null {
  const item = asRecord(raw);
  if (!item) return null;
  const mySubmission = normalizeHomeworkSubmission(item.mySubmission ?? item.my_submission);
  return {
    id: str(item.id),
    teacherId: str(item.teacherId ?? item.teacher_id),
    teacherName: str(item.teacherName ?? item.teacher_name),
    groupId: str(item.groupId ?? item.group_id),
    groupTitle: str(item.groupTitle ?? item.group_title),
    title: str(item.title),
    description: str(item.description),
    dueAt: str(item.dueAt ?? item.due_at) || undefined,
    isActive: item.isActive !== undefined ? Boolean(item.isActive) : Boolean(item.is_active),
    createdAt: str(item.createdAt ?? item.created_at),
    mySubmission: mySubmission ?? undefined,
  };
}

export function toAppStatePayload(state: RemoteStatePayload, session: AppState["session"]): AppState {
  return {
    students: state.students,
    teachers: state.teachers,
    groups: state.groups,
    rankings: state.rankings,
    ratingLogs: state.ratingLogs,
    session,
  };
}

export const platformApi = {
  async login(payload: LoginPayload) {
    const response = await apiRequest<unknown>("/auth/login", {
      method: "POST",
      body: payload,
    });
    return normalizeAuthResponse(response);
  },

  async register(payload: RegisterPayload) {
    const body: Record<string, string> = {
      full_name: payload.fullName.trim(),
      phone: payload.phone,
      password: payload.password,
      group_id: payload.groupId,
      group: payload.groupTitle ?? "",
      time: payload.time,
      days_pattern: payload.daysPattern,
    };
    if (payload.confirmPassword) {
      body.password_confirm = payload.confirmPassword;
    }

    const response = await apiRequest<unknown>("/auth/register", {
      method: "POST",
      body,
      timeoutMs: 5000,
    });
    return normalizeAuthResponse(response);
  },

  async getState(token: string) {
    const response = await apiRequest<unknown>("/platform/state", {
      method: "GET",
      token,
    });
    return normalizeStatePayload(response);
  },

  async createPayment(token: string, provider: PaymentProvider) {
    const response = await apiRequest<unknown>("/payments/create", {
      method: "POST",
      token,
      body: { provider },
    });
    const data = getDataObject(response);
    if (!data) {
      throw new Error("Invalid payment response");
    }
    return {
      transaction: normalizePaymentTransaction(data.transaction),
      subscription: normalizeSubscription(data.subscription),
    };
  },

  async getPaymentStatus(token: string) {
    const response = await apiRequest<unknown>("/payments/status", {
      method: "GET",
      token,
    });
    const data = getDataObject(response);
    if (!data) {
      throw new Error("Invalid payment status response");
    }
    return {
      subscription: normalizeSubscription(data.subscription),
      lastTransaction: normalizePaymentTransaction(data.lastTransaction ?? data.last_transaction),
    };
  },

  async getTeacherManualPaymentRequests(token: string) {
    const response = await apiRequest<unknown>("/teacher/payments/manual-requests", {
      method: "GET",
      token,
    });
    const data = getDataObject(response);
    return readArray<unknown>(data?.requests)
      .map(normalizeTeacherManualPaymentRequest)
      .filter((item): item is TeacherManualPaymentRequest => item !== null);
  },

  async approveTeacherManualPaymentRequest(token: string, transactionId: string, days?: number) {
    return apiRequest<void>(`/teacher/payments/manual-requests/${transactionId}/approve`, {
      method: "POST",
      token,
      body: days ? { days } : {},
    });
  },

  async rejectTeacherManualPaymentRequest(token: string, transactionId: string) {
    return apiRequest<void>(`/teacher/payments/manual-requests/${transactionId}/reject`, {
      method: "POST",
      token,
      body: {},
    });
  },

  applyScore(token: string, studentId: string, groupId: string, action: ScoreAction) {
    return apiRequest<void>(`/teacher/groups/${groupId}/students/${studentId}/score`, {
      method: "POST",
      token,
      body: {
        delta: action.value,
        label: action.label,
      },
    });
  },

  updateAvatar(token: string, avatarUrl: string) {
    return apiRequest<void>("/users/me/avatar", {
      method: "PATCH",
      token,
      body: { avatarUrl },
    });
  },

  logout(token: string) {
    return apiRequest<void>("/auth/logout", {
      method: "POST",
      token,
    });
  },

  async getProfile(token: string, userId: string) {
    const response = await apiRequest<unknown>(`/users/profile/${userId}`, {
      method: "GET",
      token,
    });
    return normalizeProfilePayload(response);
  },

  async getMyProgress(token: string) {
    const response = await apiRequest<unknown>("/progress/me", {
      method: "GET",
      token,
    });
    return normalizeProgressPayload(response);
  },

  async getStudentProgress(token: string, studentId: string) {
    const response = await apiRequest<unknown>(`/teacher/students/${studentId}/progress`, {
      method: "GET",
      token,
    });
    return normalizeProgressPayload(response);
  },

  async updateStudentProgress(
    token: string,
    studentId: string,
    payload: Partial<Omit<ProgressSnapshot, "status">> & { status?: ProgressSnapshot["status"] },
  ) {
    const response = await apiRequest<unknown>(`/teacher/students/${studentId}/progress`, {
      method: "PATCH",
      token,
      body: {
        progress_grammar: payload.grammar,
        progress_vocabulary: payload.vocabulary,
        progress_homework: payload.homework,
        progress_speaking: payload.speaking,
        progress_attendance: payload.attendance,
        weekly_xp: payload.weeklyXp,
        level: payload.level,
        streak_days: payload.streakDays,
        status_badge: payload.status,
      },
    });
    return normalizeProgressPayload(response);
  },

  async getGrammarTopics(token: string) {
    const response = await apiRequest<unknown>("/grammar/topics", {
      method: "GET",
      token,
    });
    const data = getDataObject(response);
    return readArray<unknown>(data?.topics ?? data)
      .map(normalizeGrammarTopic)
      .filter((item): item is GrammarTopic => item !== null);
  },

  async createGrammarTopic(token: string, payload: { title: string; description: string; level: string; pptUrl: string }) {
    const response = await apiRequest<unknown>("/grammar/topics", {
      method: "POST",
      token,
      body: {
        title: payload.title,
        description: payload.description,
        level: payload.level,
        ppt_url: payload.pptUrl,
      },
    });
    const data = getDataObject(response);
    const topic = normalizeGrammarTopic(data?.topic ?? data);
    if (!topic) throw new Error("Invalid topic response");
    return topic;
  },

  async getSupportTickets(token: string) {
    const response = await apiRequest<unknown>("/support/tickets", {
      method: "GET",
      token,
    });
    const data = getDataObject(response);
    return readArray<unknown>(data?.tickets ?? data)
      .map(normalizeSupportTicket)
      .filter((item): item is SupportTicket => item !== null);
  },

  async createSupportTicket(token: string, message: string) {
    const response = await apiRequest<unknown>("/support/tickets", {
      method: "POST",
      token,
      body: { message },
    });
    const data = getDataObject(response);
    const ticket = normalizeSupportTicket(data?.ticket ?? data);
    if (!ticket) throw new Error("Invalid support response");
    return ticket;
  },

  async updateSupportTicket(token: string, ticketId: string, status: SupportTicketStatus) {
    const response = await apiRequest<unknown>(`/support/tickets/${ticketId}`, {
      method: "PATCH",
      token,
      body: { status },
    });
    const data = getDataObject(response);
    const ticket = normalizeSupportTicket(data?.ticket ?? data);
    if (!ticket) throw new Error("Invalid support response");
    return ticket;
  },

  async getAiMessages(token: string) {
    const response = await apiRequest<unknown>("/chat/ai/messages", {
      method: "GET",
      token,
      timeoutMs: 60000,
    });
    const data = getDataObject(response);
    const conversation = asRecord(data?.conversation);
    return readArray<unknown>(data?.messages ?? conversation?.messages)
      .map(normalizeAiChatMessage)
      .filter((item): item is AiChatMessage => item !== null);
  },

  async sendAiMessage(token: string, payload: { text?: string; imageBase64?: string }) {
    const response = await apiRequest<unknown>("/chat/ai/messages", {
      method: "POST",
      token,
      body: payload,
      timeoutMs: 90000,
    });
    const data = getDataObject(response);
    return readArray<unknown>(data?.messages)
      .map(normalizeAiChatMessage)
      .filter((item): item is AiChatMessage => item !== null);
  },

  async deactivateStudent(token: string, studentId: string) {
    return apiRequest<void>(`/teacher/students/${studentId}/deactivate`, {
      method: "PATCH",
      token,
      body: {},
    });
  },

  async grantStudentSubscription(token: string, studentId: string, days?: number) {
    return apiRequest<void>(`/teacher/students/${studentId}/subscription`, {
      method: "POST",
      token,
      body: days ? { days } : {},
    });
  },

  async renameTeacherGroup(token: string, groupId: string, title: string) {
    return apiRequest<void>(`/teacher/groups/${groupId}`, {
      method: "PATCH",
      token,
      body: { title: title.trim() },
    });
  },

  async getFriendlyConversations(token: string) {
    const response = await apiRequest<unknown>("/chat/friendly/conversations", {
      method: "GET",
      token,
      timeoutMs: 30000,
    });
    const data = getDataObject(response);
    return readArray<unknown>(data?.conversations ?? data)
      .map(normalizeFriendlyConversation)
      .filter((item): item is FriendlyConversation => item !== null);
  },

  async startFriendlyConversation(token: string, targetUserId: string) {
    const response = await apiRequest<unknown>("/chat/friendly/conversations", {
      method: "POST",
      token,
      body: { targetUserId: Number(targetUserId) },
      timeoutMs: 30000,
    });
    const data = getDataObject(response);
    const conversation = normalizeFriendlyConversation(data?.conversation ?? data);
    if (!conversation) throw new Error("Invalid friendly conversation response");
    return conversation;
  },

  async getFriendlyMessages(token: string, conversationId: string) {
    const response = await apiRequest<unknown>(`/chat/friendly/conversations/${conversationId}/messages`, {
      method: "GET",
      token,
      timeoutMs: 30000,
    });
    const data = getDataObject(response);
    return readArray<unknown>(data?.messages ?? data)
      .map(normalizeFriendlyMessage)
      .filter((item): item is FriendlyChatMessage => item !== null);
  },

  async sendFriendlyMessage(token: string, conversationId: string, text: string) {
    const response = await apiRequest<unknown>(`/chat/friendly/conversations/${conversationId}/messages`, {
      method: "POST",
      token,
      body: { text },
      timeoutMs: 30000,
    });
    const data = getDataObject(response);
    const message = normalizeFriendlyMessage(data?.message ?? data);
    if (!message) throw new Error("Invalid friendly message response");
    return message;
  },

  async getTeacherHomeworkTasks(token: string, groupId?: string) {
    const query = groupId ? `?group_id=${encodeURIComponent(groupId)}` : "";
    const response = await apiRequest<unknown>(`/teacher/homework/tasks${query}`, {
      method: "GET",
      token,
      timeoutMs: 30000,
    });
    const data = getDataObject(response);
    return readArray<unknown>(data?.tasks ?? data)
      .map(normalizeHomeworkTask)
      .filter((item): item is HomeworkTask => item !== null);
  },

  async createTeacherHomeworkTask(
    token: string,
    payload: { groupId: string; title: string; description?: string; dueAt?: string },
  ) {
    const response = await apiRequest<unknown>("/teacher/homework/tasks", {
      method: "POST",
      token,
      body: {
        group_id: Number(payload.groupId),
        title: payload.title,
        description: payload.description ?? "",
        due_at: payload.dueAt,
      },
      timeoutMs: 30000,
    });
    const data = getDataObject(response);
    const task = normalizeHomeworkTask(data?.task ?? data);
    if (!task) throw new Error("Invalid homework task response");
    return task;
  },

  async getTeacherHomeworkSubmissions(token: string, taskId: string) {
    const response = await apiRequest<unknown>(`/teacher/homework/tasks/${taskId}/submissions`, {
      method: "GET",
      token,
      timeoutMs: 30000,
    });
    const data = getDataObject(response);
    return {
      task: normalizeHomeworkTask(data?.task) ?? null,
      submissions: readArray<unknown>(data?.submissions)
        .map(normalizeHomeworkSubmission)
        .filter((item): item is HomeworkSubmission => item !== null),
    };
  },

  async reviewHomeworkSubmission(
    token: string,
    submissionId: string,
    payload: { status?: "submitted" | "reviewed"; teacherComment?: string; score?: number | null },
  ) {
    const response = await apiRequest<unknown>(`/teacher/homework/submissions/${submissionId}`, {
      method: "PATCH",
      token,
      body: {
        status: payload.status,
        teacher_comment: payload.teacherComment,
        score: payload.score,
      },
      timeoutMs: 30000,
    });
    const data = getDataObject(response);
    const submission = normalizeHomeworkSubmission(data?.submission ?? data);
    if (!submission) throw new Error("Invalid homework submission response");
    return submission;
  },

  async getStudentHomeworkTasks(token: string) {
    const response = await apiRequest<unknown>("/student/homework/tasks", {
      method: "GET",
      token,
      timeoutMs: 30000,
    });
    const data = getDataObject(response);
    return readArray<unknown>(data?.tasks ?? data)
      .map(normalizeHomeworkTask)
      .filter((item): item is HomeworkTask => item !== null);
  },

  async submitStudentHomework(token: string, taskId: string, answerText: string) {
    const response = await apiRequest<unknown>(`/student/homework/tasks/${taskId}/submit`, {
      method: "POST",
      token,
      body: { answer_text: answerText },
      timeoutMs: 30000,
    });
    const data = getDataObject(response);
    const submission = normalizeHomeworkSubmission(data?.submission ?? data);
    if (!submission) throw new Error("Invalid homework submission response");
    return submission;
  },
};
