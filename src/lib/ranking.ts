import type { AppState, RankingItem, Student } from "../types";

export function sortByPoints(items: RankingItem[]): RankingItem[] {
  return [...items].sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName));
}

export function getGlobalTop(state: AppState, limit = 10): RankingItem[] {
  return sortByPoints(state.rankings).slice(0, limit);
}

export function getGroupTop(state: AppState, groupId: string, limit = 10): RankingItem[] {
  return sortByPoints(state.rankings.filter((item) => item.groupId === groupId)).slice(0, limit);
}

export function getStudentById(state: AppState, studentId: string): Student | undefined {
  return state.students.find((student) => student.id === studentId);
}

export function getGlobalPlace(state: AppState, studentId: string): number {
  return sortByPoints(state.rankings).findIndex((entry) => entry.studentId === studentId) + 1;
}

export function getGroupPlace(state: AppState, studentId: string, groupId: string): number {
  return sortByPoints(state.rankings.filter((entry) => entry.groupId === groupId)).findIndex(
    (entry) => entry.studentId === studentId,
  ) + 1;
}

export function getScoreColor(score: number): string {
  if (score >= 50) return "text-emerald-600";
  if (score >= 35) return "text-burgundy-700";
  return "text-rose-600";
}
