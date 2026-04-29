import type { AppState, Group, Teacher } from "../types";

export function getTeacherAccessibleGroupIds(state: AppState, _teacher: Teacher): Set<string> {
  return new Set(state.groups.map(g => g.id));
}

export function getTeacherAccessibleGroups(state: AppState, teacher: Teacher): Group[] {
  const accessibleIds = getTeacherAccessibleGroupIds(state, teacher);
  return state.groups.filter((group) => accessibleIds.has(group.id));
}

export function hasTeacherGroupAccess(state: AppState, teacher: Teacher, groupId: string): boolean {
  return getTeacherAccessibleGroupIds(state, teacher).has(groupId);
}
