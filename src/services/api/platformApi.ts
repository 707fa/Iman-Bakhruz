import type {
  AppState,
  Group,
  LoginPayload,
  RankingItem,
  RatingLog,
  RegisterPayload,
  ScoreAction,
  Student,
  Teacher,
  UserRole,
} from "../../types";
import { apiRequest } from "./http";

export interface AuthResponse {
  token: string;
  role: UserRole;
  userId: string;
}

export interface RemoteStatePayload {
  students: Student[];
  teachers: Teacher[];
  groups: Group[];
  rankings: RankingItem[];
  ratingLogs: RatingLog[];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

function getDataObject(payload: unknown): UnknownRecord | null {
  const root = asRecord(payload);
  if (!root) return null;

  const nestedData = asRecord(root.data);
  return nestedData ?? root;
}

function normalizeRole(value: unknown): UserRole {
  return value === "teacher" ? "teacher" : "student";
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
    token: String(token),
    role,
    userId: String(userId),
  };
}

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
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
    students: readArray<Student>(data.students),
    teachers: readArray<Teacher>(data.teachers),
    groups: readArray<Group>(data.groups),
    rankings: readArray<RankingItem>(data.rankings),
    ratingLogs: readArray<RatingLog>(data.ratingLogs),
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
      fullName: payload.fullName,
      phone: payload.phone,
      password: payload.password,
      confirmPassword: payload.confirmPassword ?? payload.password,
      group: payload.groupTitle ?? payload.groupId,
      groupId: payload.groupId,
      time: payload.time,
      daysPattern: payload.daysPattern,
    };

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
};
