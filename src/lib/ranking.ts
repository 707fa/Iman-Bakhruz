import type { AppState, RankingItem, Student } from "../types";

export function sortByPoints(items: RankingItem[]): RankingItem[] {
  return [...items].sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName));
}

function buildLiveRanking(state: AppState): RankingItem[] {
  return state.students.map((student) => ({
    studentId: student.id,
    fullName: student.fullName,
    groupId: student.groupId,
    points: student.points,
    avatarUrl: student.avatarUrl,
  }));
}

export function getGlobalTop(state: AppState, limit = 10): RankingItem[] {
  return sortByPoints(buildLiveRanking(state)).slice(0, limit);
}

export function getGroupTop(state: AppState, groupId: string, limit = 10): RankingItem[] {
  return sortByPoints(buildLiveRanking(state).filter((item) => item.groupId === groupId)).slice(0, limit);
}

export function getGlobalTopLive(state: AppState, limit = 10): RankingItem[] {
  return sortByPoints(buildLiveRanking(state)).slice(0, limit);
}

export function getGroupTopLive(state: AppState, groupId: string, limit = 10): RankingItem[] {
  return sortByPoints(buildLiveRanking(state).filter((item) => item.groupId === groupId)).slice(0, limit);
}

export function getStudentById(state: AppState, studentId: string): Student | undefined {
  return state.students.find((student) => student.id === studentId);
}

export function getGlobalPlace(state: AppState, studentId: string): number {
  return sortByPoints(buildLiveRanking(state)).findIndex((entry) => entry.studentId === studentId) + 1;
}

export function getGroupPlace(state: AppState, studentId: string, groupId: string): number {
  return sortByPoints(buildLiveRanking(state).filter((entry) => entry.groupId === groupId)).findIndex(
    (entry) => entry.studentId === studentId,
  ) + 1;
}

export function getPublishedStudentPoints(state: AppState, studentId: string): number {
  return state.students.find((entry) => entry.id === studentId)?.points ?? 0;
}

export function getScoreColor(score: number): string {
  if (score >= 50) return "text-emerald-600";
  if (score >= 35) return "text-burgundy-700";
  return "text-rose-600";
}
