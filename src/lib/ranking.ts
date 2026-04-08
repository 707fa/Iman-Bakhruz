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
    statusBadge: student.statusBadge,
  }));
}

export function getGlobalTop(state: AppState, limit = 10): RankingItem[] {
  return sortByPoints(buildLiveRanking(state)).slice(0, limit);
}

export function getGroupTop(state: AppState, groupId: string, limit = 10): RankingItem[] {
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

export function getRankTitle(place: number): string {
  if (!Number.isFinite(place) || place <= 0) return "Unranked";
  if (place <= 5) return "Hero";
  if (place <= 10) return "Best";
  if (place <= 20) return "Not bad";
  if (place <= 40) return "Good";
  if (place <= 60) return "Softly";
  return "Loser";
}
