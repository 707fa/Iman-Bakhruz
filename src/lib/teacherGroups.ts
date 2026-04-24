import type { AppState, Group, Teacher } from "../types";

export function getTeacherAccessibleGroupIds(state: AppState, teacher: Teacher): Set<string> {
  const ids = new Set<string>(teacher.groupIds);

  for (const group of state.groups) {
    if (group.teacherId === teacher.id) {
      ids.add(group.id);
    }
  }

  return ids;
}

export function getTeacherAccessibleGroups(state: AppState, teacher: Teacher): Group[] {
  const accessibleIds = getTeacherAccessibleGroupIds(state, teacher);
  return state.groups.filter((group) => accessibleIds.has(group.id));
}

export function hasTeacherGroupAccess(state: AppState, teacher: Teacher, groupId: string): boolean {
  return getTeacherAccessibleGroupIds(state, teacher).has(groupId);
}
