import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { initialState } from "../data/mockData";
import { isTodayRecalcBeforeClass } from "../lib/schedule";
import { makeId, toPhone } from "../lib/utils";
import type {
  ActionResult,
  AppState,
  LoginPayload,
  RankingItem,
  RegisterPayload,
  ScoreAction,
  Student,
  Teacher,
} from "../types";

const STORAGE_KEY = "result-dashboard-v5";

function syncRankingsBySchedule(state: AppState): AppState {
  const now = new Date();
  const groupsToRecalc = new Set(
    state.groups.filter((group) => isTodayRecalcBeforeClass(group, now)).map((group) => group.id),
  );

  if (!groupsToRecalc.size) {
    return state;
  }

  let hasChanges = false;

  const nextRankings = state.rankings.map((rank) => {
    if (!groupsToRecalc.has(rank.groupId)) {
      return rank;
    }

    const student = state.students.find((item) => item.id === rank.studentId);
    if (!student) return rank;

    const nextRank: RankingItem = {
      ...rank,
      fullName: student.fullName,
      groupId: student.groupId,
      points: student.points,
      avatarUrl: student.avatarUrl,
    };

    if (
      nextRank.fullName !== rank.fullName ||
      nextRank.groupId !== rank.groupId ||
      nextRank.points !== rank.points ||
      nextRank.avatarUrl !== rank.avatarUrl
    ) {
      hasChanges = true;
    }

    return nextRank;
  });

  if (!hasChanges) {
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
    return syncRankingsBySchedule(parsed);
  } catch {
    return initialState;
  }
}

function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface StoreValue {
  state: AppState;
  currentStudent: Student | null;
  currentTeacher: Teacher | null;
  login: (payload: LoginPayload) => ActionResult;
  registerStudent: (payload: RegisterPayload) => ActionResult;
  logout: () => void;
  updateAvatar: (fileUrl: string) => void;
  applyScore: (studentId: string, groupId: string, action: ScoreAction) => ActionResult;
}

const StoreContext = createContext<StoreValue | undefined>(undefined);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(() => readState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const syncNow = () => {
      setState((prev) => syncRankingsBySchedule(prev));
    };

    syncNow();

    // Lightweight check: ranking places can change only on weekly recalculation windows.
    const timer = window.setInterval(syncNow, 5 * 60_000);
    const onFocus = () => syncNow();
    const onVisibilityChange = () => {
      if (!document.hidden) syncNow();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
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

  function login(payload: LoginPayload): ActionResult {
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

  function registerStudent(payload: RegisterPayload): ActionResult {
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

  function logout() {
    setState((prev) => ({ ...prev, session: null }));
  }

  function updateAvatar(fileUrl: string) {
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

  function applyScore(studentId: string, groupId: string, action: ScoreAction): ActionResult {
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

      return syncRankingsBySchedule(nextState);
    });

    return { ok: true, messageKey: "msg.scoreUpdated" };
  }

  const value = useMemo<StoreValue>(
    () => ({
      state,
      currentStudent,
      currentTeacher,
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
