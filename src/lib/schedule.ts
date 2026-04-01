import type { Group, GroupDaysPattern } from "../types";

export function getPrimaryRecalcDayPatternKey(daysPattern: GroupDaysPattern): "day.monday" | "day.tuesday" {
  return daysPattern === "mwf" ? "day.monday" : "day.tuesday";
}

export function getClassStartTime(timeRange: string): string {
  const [start] = timeRange.split("-");
  return start?.trim() ?? "00:00";
}

export function isTodayRecalcBeforeClass(group: Group, now = new Date()): boolean {
  const weekday = group.daysPattern === "mwf" ? 1 : 2;
  if (now.getDay() !== weekday) return false;

  const start = getClassStartTime(group.time);
  const [h, m] = start.split(":").map((item) => Number(item));

  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;

  const lessonStart = new Date(now);
  lessonStart.setHours(h, m, 0, 0);

  return now.getTime() <= lessonStart.getTime();
}
