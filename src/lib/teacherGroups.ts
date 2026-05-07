import type { AppState, Group, Teacher } from "../types";

export function getTeacherAccessibleGroupIds(state: AppState, _teacher: Teacher): Set<string> {
  const ownGroupIds = state.groups
    .filter((group) => String(group.teacherId) === String(_teacher.id))
    .map((group) => group.id);
  const listedGroupIds = _teacher.groupIds.filter((groupId) => state.groups.some((group) => group.id === groupId));
  const ids = new Set([...ownGroupIds, ...listedGroupIds]);
  return ids.size > 0 ? ids : new Set();
}

export function getTeacherAccessibleGroups(state: AppState, teacher: Teacher): Group[] {
  const accessibleIds = getTeacherAccessibleGroupIds(state, teacher);
  return state.groups.filter((group) => accessibleIds.has(group.id));
}

export function hasTeacherGroupAccess(state: AppState, teacher: Teacher, groupId: string): boolean {
  return getTeacherAccessibleGroupIds(state, teacher).has(groupId);
}
