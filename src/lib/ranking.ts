import type { AppState, RankingItem, Student } from "../types";
import { computeStudentStatusBadge } from "./computeProgress";

export function sortByPoints(items: RankingItem[]): RankingItem[] {
  return [...items].sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName));
}

function isRankedStudent(student: Student): boolean {
  return student.isActive !== false && student.isImanStudent !== false;
}

function buildLiveRanking(state: AppState): RankingItem[] {
  return state.students.filter(isRankedStudent).map((student) => ({
    studentId: student.id,
    fullName: student.fullName,
    groupId: student.groupId,
    points: student.points,
    avatarUrl: student.avatarUrl,
    statusBadge: computeStudentStatusBadge(student),
  }));
}

export function getGlobalTop(state: AppState, limit = 10): RankingItem[] {
  return sortByPoints(buildLiveRanking(state)).slice(0, limit);
}

export function getGroupTop(state: AppState, groupId: string, limit = 10): RankingItem[] {
  return sortByPoints(buildLiveRanking(state).filter((item) => item.groupId === groupId)).slice(0, limit);
}

export function getGlobalRankCount(state: AppState): number {
  return buildLiveRanking(state).length;
}

export function getGroupRankCount(state: AppState, groupId: string): number {
  return buildLiveRanking(state).filter((item) => item.groupId === groupId).length;
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

export function getRankTitle(place: number, total = 0): string {
  if (!Number.isFinite(place) || place <= 0) return "Без рейтинга";
  if (place === 1) return "Чемпион";
  if (total > 1 && place === total) return "Лузер";
  if (place <= 10) return "Топ лучший";
  return "Старайся";
}
