import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
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
  Parent,
  ParentRegisterPayload,
  RankingItem,
  RegisterPayload,
  ScoreAction,
  Student,
  StudentAccessState,
  Teacher,
  SubscriptionState,
} from "../types";

const STORAGE_KEY = "result-dashboard-v7";
const TOP5_GRANTS_KEY = "result-top5-grants-v1";
const TOP5_GRANT_DAYS = 30;
const TOP5_LIMIT = 5;

type Top5GrantMap = Record<string, string>;

function toArrayOrFallback<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { role?: unknown; userId?: unknown };
  return (maybe.role === "student" || maybe.role === "teacher" || maybe.role === "parent") && typeof maybe.userId === "string";
}

function makeParentInviteCode(studentId: string): string {
  return `PARENT-${studentId.replace(/[^a-z0-9]/gi, "").toUpperCase()}`;
}

function ensureStudentInviteCode(student: Student): Student {
  if (student.parentInviteCode?.trim()) return student;
  return {
    ...student,
    parentInviteCode: makeParentInviteCode(student.id),
  };
}

function toIsoAfterDays(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

function isFutureIso(value?: string): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function readTop5Grants(): Top5GrantMap {
  if (typeof window === "undefined") return {};

  const raw = window.localStorage.getItem(TOP5_GRANTS_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const next: Top5GrantMap = {};
    for (const [studentId, paidUntil] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof studentId !== "string" || typeof paidUntil !== "string") continue;
      if (!isFutureIso(paidUntil)) continue;
      next[studentId] = paidUntil;
    }

    return next;
  } catch {
    return {};
  }
}

function saveTop5Grants(grants: Top5GrantMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOP5_GRANTS_KEY, JSON.stringify(grants));
}

function areGrantMapsEqual(current: Top5GrantMap, next: Top5GrantMap): boolean {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  if (currentKeys.length !== nextKeys.length) return false;

  for (const key of currentKeys) {
    if (current[key] !== next[key]) return false;
  }

  return true;
}

function getTopStudentIds(students: Student[], limit = TOP5_LIMIT): string[] {
  return [...students]
    .sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName))
    .slice(0, limit)
    .map((student) => student.id);
}

function syncTop5GrantMap(students: Student[], current: Top5GrantMap): Top5GrantMap {
  const topStudentIds = getTopStudentIds(students);
  const next: Top5GrantMap = {};

  for (const studentId of topStudentIds) {
    const existing = current[studentId];
    next[studentId] = isFutureIso(existing) ? existing : toIsoAfterDays(TOP5_GRANT_DAYS);
  }

  return next;
}

function resolveStudentAccessState(
  state: AppState,
  studentId: string,
  session: AuthSession | null,
  top5Grants: Top5GrantMap,
): StudentAccessState {
  const student = state.students.find((item) => item.id === studentId);
  const studentPaidUntil = student?.paidUntil;
  const sessionPaidUntil = session?.role === "student" && session.userId === studentId ? session.paidUntil : undefined;
  const paidUntil = sessionPaidUntil ?? studentPaidUntil;
  const paidBySubscription = Boolean(
    (session?.role === "student" && session.userId === studentId ? session.isPaid : undefined) ?? student?.isPaid,
  );

  if (paidBySubscription) {
    return {
      hasFullAccess: true,
      source: "paid",
      paidUntil,
    };
  }

  const top5PaidUntil = top5Grants[studentId];
  if (isFutureIso(top5PaidUntil)) {
    return {
      hasFullAccess: true,
      source: "top5",
      paidUntil: top5PaidUntil,
    };
  }

  return {
    hasFullAccess: false,
    source: "none",
  };
}

function syncRankingsWithStudents(state: AppState): AppState {
  const nextRankings: RankingItem[] = state.students.map((student) => ({
    studentId: student.id,
    fullName: student.fullName,
    groupId: student.groupId,
    points: student.points,
    avatarUrl: student.avatarUrl,
    statusBadge: student.statusBadge,
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
        current.avatarUrl === next.avatarUrl &&
        current.statusBadge === next.statusBadge
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

function mergeById<T extends { id: string }>(current: T[], seed: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of seed) {
    map.set(item.id, item);
  }
  for (const item of current) {
    map.set(item.id, item);
  }
  return [...map.values()];
}

function withSeedData(state: AppState): AppState {
  const merged: AppState = {
    ...state,
    students: mergeById(state.students, initialState.students).map(ensureStudentInviteCode),
    teachers: mergeById(state.teachers, initialState.teachers),
    parents: mergeById(state.parents, initialState.parents),
    groups: mergeById(state.groups, initialState.groups),
    ratingLogs: mergeById(state.ratingLogs, initialState.ratingLogs),
    rankings: state.rankings,
  };

  return syncRankingsWithStudents(merged);
}

function mergeForAuth<T extends { id: string; phone: string; password: string }>(seed: T[], current: T[]): T[] {
  const map = new Map<string, T>();

  for (const item of seed) {
    map.set(item.id, item);
  }

  for (const item of current) {
    const prev = map.get(item.id);
    const nextPhone = prev?.phone ?? (typeof item.phone === "string" && item.phone.trim().length > 0 ? item.phone : "");
    const nextPassword = prev?.password ?? (typeof item.password === "string" && item.password.trim().length > 0 ? item.password : "");

    map.set(item.id, {
      ...(prev ?? item),
      ...item,
      phone: nextPhone,
      password: nextPassword,
    });
  }

  return [...map.values()];
}

function getAuthCollections(state: AppState): Pick<AppState, "students" | "teachers" | "parents"> {
  const seeded = withSeedData(state);
  return {
    students: mergeForAuth(initialState.students, seeded.students),
    teachers: mergeForAuth(initialState.teachers, seeded.teachers),
    parents: mergeForAuth(initialState.parents, seeded.parents),
  };
}

function readState(): AppState {
  if (typeof window === "undefined") return initialState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;

  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const normalized: AppState = {
      students: toArrayOrFallback(parsed.students, initialState.students).map(ensureStudentInviteCode),
      teachers: toArrayOrFallback(parsed.teachers, initialState.teachers),
      parents: toArrayOrFallback(parsed.parents, initialState.parents),
      groups: toArrayOrFallback(parsed.groups, initialState.groups),
      rankings: toArrayOrFallback(parsed.rankings, initialState.rankings),
      ratingLogs: toArrayOrFallback(parsed.ratingLogs, initialState.ratingLogs),
      session: isAuthSession(parsed.session) ? parsed.session : null,
    };
    return withSeedData(normalized);
  } catch {
    return initialState;
  }
}

function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function buildSessionFromAuth(auth: AuthResponse): AuthSession {
  const session: AuthSession = {
    role: auth.role === "teacher" ? "teacher" : auth.role === "parent" ? "parent" : "student",
    userId: String(auth.userId),
  };

  if (session.role === "student" && auth.subscription) {
    session.isPaid = Boolean(auth.subscription.isPaid);
    session.paidUntil = auth.subscription.paidUntil;
  }

  return session;
}

function applySubscriptionToSession(session: AuthSession, subscription?: SubscriptionState): AuthSession {
  if (session.role !== "student") return session;

  if (!subscription) {
    return session;
  }

  return {
    ...session,
    isPaid: Boolean(subscription.isPaid),
    paidUntil: subscription.paidUntil,
  };
}

function resolveSessionFromRemote(auth: AuthResponse, remote: RemoteStatePayload): AuthSession {
  const userId = String(auth.userId);

  if (remote.teachers.some((teacher) => String(teacher.id) === userId)) {
    return { role: "teacher", userId };
  }

  if (remote.parents.some((parent) => String(parent.id) === userId)) {
    return { role: "parent", userId };
  }

  return { role: "student", userId };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = typeof atob === "function" ? atob(padded) : "";
    if (!json) return null;
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function resolveSessionFromToken(token: string, remote: RemoteStatePayload): AuthSession | null {
  const payload = decodeJwtPayload(token);
  const rawUserId = payload?.user_id;
  if (typeof rawUserId !== "string" && typeof rawUserId !== "number") {
    return null;
  }

  const userId = String(rawUserId);
  if (remote.teachers.some((teacher) => String(teacher.id) === userId)) {
    return { role: "teacher", userId };
  }

  if (remote.parents.some((parent) => String(parent.id) === userId)) {
    return { role: "parent", userId };
  }

  if (remote.students.some((student) => String(student.id) === userId)) {
    return { role: "student", userId };
  }

  return null;
}

function withRemoteState(state: AppState, remote: RemoteStatePayload, session: AuthSession | null): AppState {
  const baseSession = session ?? state.session;
  const nextSession = baseSession ? applySubscriptionToSession(baseSession, remote.subscription) : null;
  return syncRankingsWithStudents(toAppStatePayload(remote, nextSession));
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
    const parts = [
      record.message,
      record.error,
      record.detail,
      record.errors,
      ...Object.values(record),
    ]
      .map((item) => extractApiMessage(item))
      .map((item) => item.trim())
      .filter(Boolean);

    return Array.from(new Set(parts)).join(" ").trim();
  }

  return "";
}

interface StoreValue {
  state: AppState;
  currentStudent: Student | null;
  currentStudentAccess: StudentAccessState | null;
  currentTeacher: Teacher | null;
  currentParent: Parent | null;
  currentParentStudent: Student | null;
  getStudentAccess: (studentId: string) => StudentAccessState;
  isApiMode: boolean;
  login: (payload: LoginPayload) => Promise<ActionResult>;
  registerStudent: (payload: RegisterPayload) => Promise<ActionResult>;
  registerParent: (payload: ParentRegisterPayload) => Promise<ActionResult>;
  logout: () => void;
  updateAvatar: (fileUrl: string) => Promise<void>;
  applyScore: (studentId: string, groupId: string, action: ScoreAction) => Promise<ActionResult>;
  disableStudent: (studentId: string) => Promise<ActionResult>;
  renameGroup: (groupId: string, nextTitle: string) => Promise<ActionResult>;
  refreshState: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | undefined>(undefined);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(() => readState());
  const [top5Grants, setTop5Grants] = useState<Top5GrantMap>(() => readTop5Grants());

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    saveTop5Grants(top5Grants);
  }, [top5Grants]);

  useEffect(() => {
    setTop5Grants((current) => {
      const next = syncTop5GrantMap(state.students, current);
      return areGrantMapsEqual(current, next) ? current : next;
    });
  }, [state.students]);

  useEffect(() => {
    if (DATA_PROVIDER_MODE !== "api") {
      clearApiToken();
    }
  }, []);

  useEffect(() => {
    if (DATA_PROVIDER_MODE !== "api") return;

    const token = getApiToken();
    if (!token) {
      setState((prev) => (prev.session ? { ...prev, session: null } : prev));
      return;
    }

    let disposed = false;

    const syncFromApi = async () => {
      try {
        const remote = await platformApi.getState(token);
        if (disposed) return;

        setState((prev) => {
          const restoredSession =
            prev.session ??
            resolveSessionFromToken(token, remote);

          return withRemoteState(prev, remote, restoredSession);
        });
      } catch (error) {
        if (disposed) return;

        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearApiToken();
          setState((prev) => (prev.session ? { ...prev, session: null } : prev));
          return;
        }

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

  const currentParent = useMemo(() => {
    const session = state.session;
    if (!session || session.role !== "parent") return null;
    return state.parents.find((parent) => parent.id === session.userId) ?? null;
  }, [state.parents, state.session]);

  const currentParentStudent = useMemo(() => {
    if (!currentParent) return null;
    const targetStudentId = currentParent.childStudentIds[0];
    if (!targetStudentId) return null;
    return state.students.find((student) => student.id === targetStudentId) ?? null;
  }, [currentParent, state.students]);

  const getStudentAccess = useCallback(
    (studentId: string): StudentAccessState => resolveStudentAccessState(state, studentId, state.session, top5Grants),
    [state, top5Grants],
  );

  const currentStudentAccess = useMemo(() => {
    if (!currentStudent) return null;
    return resolveStudentAccessState(state, currentStudent.id, state.session, top5Grants);
  }, [currentStudent, state, top5Grants]);

  function loginMock(payload: LoginPayload): ActionResult {
    const phone = toPhone(payload.phone);
    const password = payload.password.trim();
    const normalizedPassword = password.toLowerCase();
    if (!phone) {
      return { ok: false, messageKey: "msg.phoneInvalid" };
    }
    const authCollections = getAuthCollections(state);
    const teacherMatch = authCollections.teachers.find(
      (item) => toPhone(item.phone) === phone && item.password.trim().toLowerCase() === normalizedPassword,
    );
    if (teacherMatch) {
      setState((prev) => ({ ...withSeedData(prev), session: { role: "teacher", userId: teacherMatch.id } }));
      return { ok: true, messageKey: "msg.loginTeacher" };
    }

    const parentMatch = authCollections.parents.find(
      (item) => toPhone(item.phone) === phone && item.password.trim().toLowerCase() === normalizedPassword,
    );
    if (parentMatch) {
      setState((prev) => ({ ...withSeedData(prev), session: { role: "parent", userId: parentMatch.id } }));
      return { ok: true, messageKey: "msg.loginParent" };
    }

    const studentMatch = authCollections.students.find(
      (item) => toPhone(item.phone) === phone && item.password.trim().toLowerCase() === normalizedPassword,
    );
    if (studentMatch) {
      if (studentMatch.isActive === false) {
        return { ok: false, messageKey: "msg.loginInvalid" };
      }
      setState((prev) => ({ ...withSeedData(prev), session: { role: "student", userId: studentMatch.id } }));
      return { ok: true, messageKey: "msg.loginStudent" };
    }

    return { ok: false, messageKey: "msg.loginInvalid" };
  }

  function registerStudentMock(payload: RegisterPayload): ActionResult {
    const seeded = withSeedData(state);
    const authCollections = getAuthCollections(seeded);
    const fullName = payload.fullName.trim();
    const phone = toPhone(payload.phone);

    if (!phone) {
      return { ok: false, messageKey: "msg.phoneInvalid" };
    }

    if (fullName.length < 3) {
      return { ok: false, messageKey: "msg.registerInvalidName" };
    }

    const phoneUsed =
      authCollections.students.some((student) => toPhone(student.phone) === phone) ||
      authCollections.teachers.some((teacher) => toPhone(teacher.phone) === phone) ||
      authCollections.parents.some((parent) => toPhone(parent.phone) === phone);

    if (phoneUsed) {
      return { ok: false, messageKey: "msg.registerPhoneUsed" };
    }

    if (payload.password.length < 6) {
      return { ok: false, messageKey: "msg.registerPasswordShort" };
    }

    const isImanStudent = payload.isImanStudent !== false;
    const group = isImanStudent
      ? seeded.groups.find(
          (item) =>
            ((payload.groupId && item.id === payload.groupId) ||
              (payload.groupTitle && item.title === payload.groupTitle && item.time === payload.time)) &&
            item.daysPattern === payload.daysPattern,
        )
      : null;
    if (isImanStudent && !group) {
      return { ok: false, messageKey: "msg.registerGroupInvalid" };
    }

    const studentId = makeId("s");
    const student: Student = {
      id: studentId,
      fullName,
      phone,
      password: payload.password,
      groupId: group?.id ?? "",
      parentInviteCode: makeParentInviteCode(studentId),
      points: 0,
      isActive: true,
      isImanStudent,
    };

    const ranking: RankingItem | null = isImanStudent
      ? {
          studentId: student.id,
          fullName: student.fullName,
          groupId: student.groupId,
          points: student.points,
        }
      : null;

    setState((prev) => {
      const base = withSeedData(prev);
      return {
        ...base,
        students: [...base.students, student],
        rankings: ranking ? [...base.rankings, ranking] : base.rankings,
        session: { role: "student", userId: student.id },
      };
    });

    return {
      ok: true,
      messageKey: "msg.registerSuccess",
      messageParams: { group: group?.title ?? "-", time: group?.time ?? "-" },
    };
  }

  function registerParentMock(payload: ParentRegisterPayload): ActionResult {
    const seeded = withSeedData(state);
    const authCollections = getAuthCollections(seeded);
    const fullName = payload.fullName.trim();
    const phone = toPhone(payload.phone);
    const inviteCode = payload.parentInviteCode.trim().toUpperCase();

    if (!phone) {
      return { ok: false, messageKey: "msg.phoneInvalid" };
    }

    if (fullName.length < 3) {
      return { ok: false, messageKey: "msg.registerInvalidName" };
    }

    const phoneUsed =
      authCollections.students.some((student) => toPhone(student.phone) === phone) ||
      authCollections.teachers.some((teacher) => toPhone(teacher.phone) === phone) ||
      authCollections.parents.some((parent) => toPhone(parent.phone) === phone);

    if (phoneUsed) {
      return { ok: false, messageKey: "msg.registerPhoneUsed" };
    }

    if (payload.password.length < 6) {
      return { ok: false, messageKey: "msg.registerPasswordShort" };
    }

    const child = seeded.students.find((student) => (student.parentInviteCode ?? "").trim().toUpperCase() === inviteCode);
    if (!child) {
      return { ok: false, messageKey: "msg.parentInviteInvalid" };
    }

    const parent: Parent = {
      id: makeId("p"),
      fullName,
      phone,
      password: payload.password,
      childStudentIds: [child.id],
    };

    setState((prev) => {
      const base = withSeedData(prev);
      return {
        ...base,
        parents: [...base.parents, parent],
        session: { role: "parent", userId: parent.id },
      };
    });

    return {
      ok: true,
      messageKey: "msg.parentRegisterSuccess",
      messageParams: { child: child.fullName },
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

    if (state.session.role === "parent") {
      setState((prev) => ({
        ...prev,
        parents: prev.parents.map((parent) =>
          parent.id === prev.session?.userId ? { ...parent, avatarUrl: fileUrl } : parent,
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

  function disableStudentMock(studentId: string): ActionResult {
    if (!state.session || state.session.role !== "teacher") {
      return { ok: false, messageKey: "msg.scoreOnlyTeacher" };
    }

    const teacher = state.teachers.find((item) => item.id === state.session?.userId);
    const student = state.students.find((item) => item.id === studentId);
    if (!teacher || !student || !teacher.groupIds.includes(student.groupId)) {
      return { ok: false, messageKey: "msg.scoreNoAccess" };
    }

    setState((prev) => {
      const nextStudents = prev.students.filter((item) => item.id !== studentId);
      const nextLogs = prev.ratingLogs.filter((item) => item.studentId !== studentId);
      return syncRankingsWithStudents({
        ...prev,
        students: nextStudents,
        ratingLogs: nextLogs,
      });
    });

    return { ok: true, messageKey: "msg.studentDisabled" };
  }

  function renameGroupMock(groupId: string, nextTitle: string): ActionResult {
    if (!state.session || state.session.role !== "teacher") {
      return { ok: false, messageKey: "msg.scoreOnlyTeacher" };
    }

    const trimmedTitle = nextTitle.trim();
    if (trimmedTitle.length < 2) {
      return { ok: false, messageKey: "msg.groupRenameInvalid" };
    }

    const teacher = state.teachers.find((item) => item.id === state.session?.userId);
    const group = state.groups.find((item) => item.id === groupId);
    if (!teacher || !group || !teacher.groupIds.includes(groupId)) {
      return { ok: false, messageKey: "msg.scoreNoAccess" };
    }

    setState((prev) => ({
      ...prev,
      groups: prev.groups.map((item) => (item.id === groupId ? { ...item, title: trimmedTitle } : item)),
    }));

    return { ok: true, messageKey: "msg.groupRenameSuccess" };
  }

  async function login(payload: LoginPayload): Promise<ActionResult> {
    const normalizedPayload: LoginPayload = {
      phone: toPhone(payload.phone),
      password: payload.password.trim(),
    };

    if (!normalizedPayload.phone) {
      return { ok: false, messageKey: "msg.phoneInvalid" };
    }

    const authCollections = getAuthCollections(state);
    const parentMatch = authCollections.parents.find(
      (item) =>
        toPhone(item.phone) === normalizedPayload.phone &&
        item.password.trim().toLowerCase() === normalizedPayload.password.toLowerCase(),
    );
    if (parentMatch) {
      setState((prev) => ({ ...withSeedData(prev), session: { role: "parent", userId: parentMatch.id } }));
      return { ok: true, messageKey: "msg.loginParent" };
    }

    if (DATA_PROVIDER_MODE === "api") {
      try {
        const auth = await platformApi.login(normalizedPayload);
        setApiToken(auth.token);

        try {
          const remote = await platformApi.getState(auth.token);
          const nextSession = applySubscriptionToSession(resolveSessionFromRemote(auth, remote), auth.subscription ?? remote.subscription);
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
        if (error instanceof ApiError) {
          // Allow local fallback only when backend is temporarily unavailable.
          // For auth errors (400/401/403), keep strict API login so token is always present.
          if (
            error.status >= 500 ||
            error.status === 0 ||
            error.status === 408
          ) {
            clearApiToken();
            const localFallback = loginMock(payload);
            if (localFallback.ok) {
              return localFallback;
            }
          }

          if (error.status === 400 || error.status === 401 || error.status === 403) {
            return { ok: false, messageKey: "msg.loginInvalid" };
          }
        }

        return { ok: false, messageKey: "msg.serverUnavailable" };
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

      if (!normalizedPayload.phone) {
        return { ok: false, messageKey: "msg.phoneInvalid" };
      }

      try {
        const auth = await platformApi.register(normalizedPayload);
        setApiToken(auth.token);
        const nextSession = buildSessionFromAuth(auth);

        // Immediate local update for fast UX. Remote state sync runs in background.
        setState((prev) => {
          const base = withSeedData(prev);

          if (nextSession.role !== "student") {
            return { ...base, session: nextSession };
          }

          const existingStudent =
            base.students.find((student) => student.id === nextSession.userId) ??
            base.students.find((student) => toPhone(student.phone) === normalizedPayload.phone);

          const fallbackStudent: Student = {
            id: nextSession.userId,
            fullName: normalizedPayload.fullName.trim(),
            phone: normalizedPayload.phone,
            password: normalizedPayload.password,
            groupId: normalizedPayload.groupId ?? existingStudent?.groupId ?? "",
            parentInviteCode: existingStudent?.parentInviteCode ?? makeParentInviteCode(nextSession.userId),
            points: existingStudent?.points ?? 0,
            avatarUrl: existingStudent?.avatarUrl,
            isActive: existingStudent?.isActive ?? true,
            isImanStudent:
              normalizedPayload.isImanStudent !== undefined
                ? normalizedPayload.isImanStudent
                : existingStudent?.isImanStudent ?? true,
          };

          const students = existingStudent
            ? base.students.map((student) => (student.id === existingStudent.id ? fallbackStudent : student))
            : [...base.students, fallbackStudent];

          return syncRankingsWithStudents({
            ...base,
            students,
            session: nextSession,
          });
        });

        void (async () => {
          try {
            const remote = await platformApi.getState(auth.token);
            const syncedSession = applySubscriptionToSession(
              resolveSessionFromRemote(auth, remote),
              auth.subscription ?? remote.subscription,
            );
            setState((prev) => withRemoteState(prev, remote, syncedSession));
          } catch {
            // Local state remains valid when backend sync is slow/unavailable.
          }
        })();

        return {
          ok: true,
          messageKey: "msg.registerSuccess",
          messageParams: {
            group: normalizedPayload.groupTitle ?? normalizedPayload.groupId ?? "-",
            time: normalizedPayload.time ?? "-",
          },
        };
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

          if (error.status >= 500) {
            return { ok: false, messageKey: "msg.serverUnavailable" };
          }

          return { ok: false, messageKey: "msg.registerInvalidData" };
        }
        return { ok: false, messageKey: "msg.serverUnavailable" };
      }
    }

    return registerStudentMock(payload);
  }

  async function registerParent(payload: ParentRegisterPayload): Promise<ActionResult> {
    return registerParentMock(payload);
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

  async function disableStudent(studentId: string): Promise<ActionResult> {
    if (!state.session || state.session.role !== "teacher") {
      return { ok: false, messageKey: "msg.scoreOnlyTeacher" };
    }

    if (DATA_PROVIDER_MODE === "api") {
      const token = getApiToken();
      if (!token) {
        return disableStudentMock(studentId);
      }

      try {
        await platformApi.deactivateStudent(token, studentId);
        const remote = await platformApi.getState(token);
        setState((prev) => withRemoteState(prev, remote, prev.session));
        return { ok: true, messageKey: "msg.studentDisabled" };
      } catch {
        return { ok: false, messageKey: "msg.serverUnavailable" };
      }
    }

    return disableStudentMock(studentId);
  }

  async function renameGroup(groupId: string, nextTitle: string): Promise<ActionResult> {
    if (!state.session || state.session.role !== "teacher") {
      return { ok: false, messageKey: "msg.scoreOnlyTeacher" };
    }

    if (DATA_PROVIDER_MODE === "api") {
      const token = getApiToken();
      if (!token) {
        return renameGroupMock(groupId, nextTitle);
      }

      try {
        await platformApi.renameTeacherGroup(token, groupId, nextTitle.trim());
        const remote = await platformApi.getState(token);
        setState((prev) => withRemoteState(prev, remote, prev.session));
        return { ok: true, messageKey: "msg.groupRenameSuccess" };
      } catch {
        // Fallback to local update to keep UX smooth if backend endpoint is not ready yet.
        return renameGroupMock(groupId, nextTitle);
      }
    }

    return renameGroupMock(groupId, nextTitle);
  }

  async function refreshState(): Promise<void> {
    if (DATA_PROVIDER_MODE !== "api") return;
    const token = getApiToken();
    if (!token) return;

    try {
      const remote = await platformApi.getState(token);
      setState((prev) => withRemoteState(prev, remote, prev.session));
    } catch {
      // Keep current UI snapshot if refresh fails.
    }
  }

  const value = useMemo<StoreValue>(
    () => ({
      state,
      currentStudent,
      currentStudentAccess,
      currentTeacher,
      currentParent,
      currentParentStudent,
      getStudentAccess,
      isApiMode: DATA_PROVIDER_MODE === "api",
      login,
      registerStudent,
      registerParent,
      logout,
      updateAvatar,
      applyScore,
      disableStudent,
      renameGroup,
      refreshState,
    }),
    [state, currentStudent, currentStudentAccess, currentTeacher, currentParent, currentParentStudent, getStudentAccess],
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
