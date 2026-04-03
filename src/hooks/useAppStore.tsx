import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { initialState } from "../data/mockData";
import { DATA_PROVIDER_MODE } from "../lib/env";
import { makeId, toPhone } from "../lib/utils";
import { ApiError } from "../services/api/http";
import { platformApi, toAppStatePayload, type AuthResponse, type RemoteStatePayload } from "../services/api/platformApi";
import { clearApiToken, getApiToken, setApiToken } from "../services/tokenStorage";
import type {
  ActionResult,
  AppState,
  AuthSession,
  LoginPayload,
  RankingItem,
  RegisterPayload,
  ScoreAction,
  Student,
  Teacher,
} from "../types";

const STORAGE_KEY = "result-dashboard-v5";

function syncRankingsWithStudents(state: AppState): AppState {
  const nextRankings: RankingItem[] = state.students.map((student) => ({
    studentId: student.id,
    fullName: student.fullName,
    groupId: student.groupId,
    points: student.points,
    avatarUrl: student.avatarUrl,
  }));

  if (
    nextRankings.length === state.rankings.length &&
    nextRankings.every((next, index) => {
      const current = state.rankings[index];
      return (
        current &&
        current.studentId === next.studentId &&
        current.fullName === next.fullName &&
        current.groupId === next.groupId &&
        current.points === next.points &&
        current.avatarUrl === next.avatarUrl
      );
    })
  ) {
    return state;
  }

  return {
    ...state,
    rankings: nextRankings,
  };
}

function readState(): AppState {
  if (typeof window === "undefined") return initialState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;

  try {
    const parsed = JSON.parse(raw) as AppState;
    if (!Array.isArray(parsed.students) || !Array.isArray(parsed.teachers) || !Array.isArray(parsed.groups)) {
      return initialState;
    }
    return syncRankingsWithStudents(parsed);
  } catch {
    return initialState;
  }
}

function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function buildSessionFromAuth(auth: AuthResponse): AuthSession {
  return {
    role: auth.role === "teacher" ? "teacher" : "student",
    userId: String(auth.userId),
  };
}

function resolveSessionFromRemote(auth: AuthResponse, remote: RemoteStatePayload): AuthSession {
  const userId = String(auth.userId);

  if (remote.teachers.some((teacher) => String(teacher.id) === userId)) {
    return { role: "teacher", userId };
  }

  return { role: "student", userId };
}

function withRemoteState(state: AppState, remote: RemoteStatePayload, session: AuthSession | null): AppState {
  return syncRankingsWithStudents(toAppStatePayload(remote, session ?? state.session));
}

function extractApiMessage(payload: unknown): string {
  if (!payload) return "";

  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => extractApiMessage(item)).join(" ").trim();
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const direct = [record.message, record.error, record.detail].map((item) => extractApiMessage(item)).join(" ").trim();
    if (direct) return direct;
    return Object.values(record).map((item) => extractApiMessage(item)).join(" ").trim();
  }

  return "";
}

interface StoreValue {
  state: AppState;
  currentStudent: Student | null;
  currentTeacher: Teacher | null;
  isApiMode: boolean;
  login: (payload: LoginPayload) => Promise<ActionResult>;
  registerStudent: (payload: RegisterPayload) => Promise<ActionResult>;
  logout: () => void;
  updateAvatar: (fileUrl: string) => Promise<void>;
  applyScore: (studentId: string, groupId: string, action: ScoreAction) => Promise<ActionResult>;
}

const StoreContext = createContext<StoreValue | undefined>(undefined);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(() => readState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (DATA_PROVIDER_MODE !== "api") return;

    const token = getApiToken();
    if (!token) return;

    let disposed = false;

    const syncFromApi = async () => {
      try {
        const remote = await platformApi.getState(token);
        if (disposed) return;

        const session = state.session
          ? resolveSessionFromRemote({ role: state.session.role, userId: state.session.userId, token }, remote)
          : null;

        setState((prev) => withRemoteState(prev, remote, session));
      } catch {
        // Keep last local snapshot if backend is unavailable.
      }
    };

    void syncFromApi();

    return () => {
      disposed = true;
    };
  }, []);

  const currentStudent = useMemo(() => {
    const session = state.session;
    if (!session || session.role !== "student") return null;
    return state.students.find((student) => student.id === session.userId) ?? null;
  }, [state.session, state.students]);

  const currentTeacher = useMemo(() => {
    const session = state.session;
    if (!session || session.role !== "teacher") return null;
    return state.teachers.find((teacher) => teacher.id === session.userId) ?? null;
  }, [state.session, state.teachers]);

  function loginMock(payload: LoginPayload): ActionResult {
    const phone = toPhone(payload.phone);
    const student = state.students.find((item) => toPhone(item.phone) === phone);
    const teacher = state.teachers.find((item) => toPhone(item.phone) === phone);

    if (student && student.password === payload.password) {
      setState((prev) => ({ ...prev, session: { role: "student", userId: student.id } }));
      return { ok: true, messageKey: "msg.loginStudent" };
    }

    if (teacher && teacher.password === payload.password) {
      setState((prev) => ({ ...prev, session: { role: "teacher", userId: teacher.id } }));
      return { ok: true, messageKey: "msg.loginTeacher" };
    }

    return { ok: false, messageKey: "msg.loginInvalid" };
  }

  function registerStudentMock(payload: RegisterPayload): ActionResult {
    const fullName = payload.fullName.trim();
    const phone = toPhone(payload.phone);

    if (fullName.length < 3) {
      return { ok: false, messageKey: "msg.registerInvalidName" };
    }

    const phoneUsed =
      state.students.some((student) => toPhone(student.phone) === phone) ||
      state.teachers.some((teacher) => toPhone(teacher.phone) === phone);

    if (phoneUsed) {
      return { ok: false, messageKey: "msg.registerPhoneUsed" };
    }

    if (payload.password.length < 6) {
      return { ok: false, messageKey: "msg.registerPasswordShort" };
    }

    const group = state.groups.find(
      (item) =>
        item.id === payload.groupId && item.time === payload.time && item.daysPattern === payload.daysPattern,
    );
    if (!group) {
      return { ok: false, messageKey: "msg.registerGroupInvalid" };
    }

    const student: Student = {
      id: makeId("s"),
      fullName,
      phone,
      password: payload.password,
      groupId: group.id,
      points: 0,
    };

    const ranking: RankingItem = {
      studentId: student.id,
      fullName: student.fullName,
      groupId: student.groupId,
      points: student.points,
    };

    setState((prev) => ({
      ...prev,
      students: [...prev.students, student],
      rankings: [...prev.rankings, ranking],
      session: { role: "student", userId: student.id },
    }));

    return {
      ok: true,
      messageKey: "msg.registerSuccess",
      messageParams: { group: group.title, time: group.time },
    };
  }

  function updateAvatarMock(fileUrl: string) {
    if (!state.session) return;

    if (state.session.role === "student") {
      setState((prev) => ({
        ...prev,
        students: prev.students.map((student) =>
          student.id === prev.session?.userId ? { ...student, avatarUrl: fileUrl } : student,
        ),
        rankings: prev.rankings.map((rank) =>
          rank.studentId === prev.session?.userId ? { ...rank, avatarUrl: fileUrl } : rank,
        ),
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      teachers: prev.teachers.map((teacher) =>
        teacher.id === prev.session?.userId ? { ...teacher, avatarUrl: fileUrl } : teacher,
      ),
    }));
  }

  function applyScoreMock(studentId: string, groupId: string, action: ScoreAction): ActionResult {
    if (!state.session || state.session.role !== "teacher") {
      return { ok: false, messageKey: "msg.scoreOnlyTeacher" };
    }

    const teacher = state.teachers.find((item) => item.id === state.session?.userId);
    if (!teacher || !teacher.groupIds.includes(groupId)) {
      return { ok: false, messageKey: "msg.scoreNoAccess" };
    }

    const student = state.students.find((item) => item.id === studentId);
    if (!student || student.groupId !== groupId) {
      return { ok: false, messageKey: "msg.scoreStudentNotFound" };
    }

    setState((prev) => {
      const updatedStudents = prev.students.map((item) =>
        item.id === studentId ? { ...item, points: Number((item.points + action.value).toFixed(2)) } : item,
      );

      const nextState: AppState = {
        ...prev,
        students: updatedStudents,
        ratingLogs: [
          {
            id: makeId("log"),
            teacherId: teacher.id,
            studentId,
            groupId,
            delta: action.value,
            label: action.label,
            createdAt: new Date().toISOString(),
          },
          ...prev.ratingLogs,
        ],
      };

      return syncRankingsWithStudents(nextState);
    });

    return { ok: true, messageKey: "msg.scoreUpdated" };
  }

  async function login(payload: LoginPayload): Promise<ActionResult> {
    if (DATA_PROVIDER_MODE === "api") {
      const normalizedPayload: LoginPayload = {
        phone: toPhone(payload.phone),
        password: payload.password,
      };

      try {
        const auth = await platformApi.login(normalizedPayload);
        setApiToken(auth.token);

        try {
          const remote = await platformApi.getState(auth.token);
          const nextSession = resolveSessionFromRemote(auth, remote);
          setState((prev) => withRemoteState(prev, remote, nextSession));
          return {
            ok: true,
            messageKey: nextSession.role === "teacher" ? "msg.loginTeacher" : "msg.loginStudent",
          };
        } catch {
          const nextSession = buildSessionFromAuth(auth);
          setState((prev) => ({ ...prev, session: nextSession }));
          return {
            ok: true,
            messageKey: nextSession.role === "teacher" ? "msg.loginTeacher" : "msg.loginStudent",
          };
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return { ok: false, messageKey: "msg.loginInvalid" };
        }
        return loginMock(payload);
      }
    }

    return loginMock(payload);
  }

  async function registerStudent(payload: RegisterPayload): Promise<ActionResult> {
    if (DATA_PROVIDER_MODE === "api") {
      const normalizedPayload: RegisterPayload = {
        ...payload,
        phone: toPhone(payload.phone),
      };

      try {
        const auth = await platformApi.register(normalizedPayload);
        setApiToken(auth.token);

        try {
          const remote = await platformApi.getState(auth.token);
          const nextSession = resolveSessionFromRemote(auth, remote);
          setState((prev) => withRemoteState(prev, remote, nextSession));
          return {
            ok: true,
            messageKey: "msg.registerSuccess",
            messageParams: {
              group: normalizedPayload.groupTitle ?? normalizedPayload.groupId,
              time: normalizedPayload.time,
            },
          };
        } catch {
          const nextSession = buildSessionFromAuth(auth);
          setState((prev) => ({ ...prev, session: nextSession }));
          return {
            ok: true,
            messageKey: "msg.registerSuccess",
            messageParams: {
              group: normalizedPayload.groupTitle ?? normalizedPayload.groupId,
              time: normalizedPayload.time,
            },
          };
        }
      } catch (error) {
        if (error instanceof ApiError) {
          const message = extractApiMessage(error.payload).toLowerCase();

          if (error.status === 409) {
            return { ok: false, messageKey: "msg.registerPhoneUsed" };
          }

          if (
            message.includes("phone") ||
            message.includes("number") ||
            message.includes("телефон") ||
            message.includes("номер") ||
            message.includes("raqam")
          ) {
            return { ok: false, messageKey: "msg.registerPhoneUsed" };
          }

          if (
            message.includes("confirm") ||
            message.includes("match") ||
            message.includes("совпад") ||
            message.includes("mos")
          ) {
            return { ok: false, messageKey: "msg.registerPasswordMismatch" };
          }

          if (
            message.includes("password") &&
            (message.includes("short") ||
              message.includes("min") ||
              message.includes("least") ||
              message.includes("длин") ||
              message.includes("kamida"))
          ) {
            return { ok: false, messageKey: "msg.registerPasswordShort" };
          }

          if (
            message.includes("group") ||
            message.includes("class") ||
            message.includes("груп") ||
            message.includes("guruh")
          ) {
            return { ok: false, messageKey: "msg.registerGroupInvalid" };
          }

          if (error.status === 400 || error.status === 422) {
            return { ok: false, messageKey: "msg.registerInvalidData" };
          }
        }
        return registerStudentMock(payload);
      }
    }

    return registerStudentMock(payload);
  }

  function logout() {
    if (DATA_PROVIDER_MODE === "api") {
      const token = getApiToken();
      clearApiToken();
      if (token) {
        void platformApi.logout(token).catch(() => {
          // No-op: local logout should still complete.
        });
      }
    }

    setState((prev) => ({ ...prev, session: null }));
  }

  async function updateAvatar(fileUrl: string): Promise<void> {
    if (!state.session) return;

    if (DATA_PROVIDER_MODE === "api") {
      const token = getApiToken();
      if (!token) {
        updateAvatarMock(fileUrl);
        return;
      }

      try {
        await platformApi.updateAvatar(token, fileUrl);
        const remote = await platformApi.getState(token);
        setState((prev) => withRemoteState(prev, remote, prev.session));
      } catch {
        updateAvatarMock(fileUrl);
      }

      return;
    }

    updateAvatarMock(fileUrl);
  }

  async function applyScore(studentId: string, groupId: string, action: ScoreAction): Promise<ActionResult> {
    if (!state.session || state.session.role !== "teacher") {
      return { ok: false, messageKey: "msg.scoreOnlyTeacher" };
    }

    if (DATA_PROVIDER_MODE === "api") {
      const token = getApiToken();
      if (!token) {
        return applyScoreMock(studentId, groupId, action);
      }

      try {
        await platformApi.applyScore(token, studentId, groupId, action);
        const remote = await platformApi.getState(token);
        setState((prev) => withRemoteState(prev, remote, prev.session));
        return { ok: true, messageKey: "msg.scoreUpdated" };
      } catch {
        return applyScoreMock(studentId, groupId, action);
      }
    }

    return applyScoreMock(studentId, groupId, action);
  }

  const value = useMemo<StoreValue>(
    () => ({
      state,
      currentStudent,
      currentTeacher,
      isApiMode: DATA_PROVIDER_MODE === "api",
      login,
      registerStudent,
      logout,
      updateAvatar,
      applyScore,
    }),
    [state, currentStudent, currentTeacher],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useAppStore must be used inside AppStoreProvider");
  }
  return context;
}
