import type { AttendanceRecord, AttendanceStatus } from "../types";
import { makeId } from "./utils";

const STORAGE_PREFIX = "iman-attendance-v1";

export function readAttendanceRecords(groupId: string): AttendanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${groupId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: unknown) => {
      if (!item || typeof item !== "object") return false;
      const rec = item as Record<string, unknown>;
      return typeof rec.studentId === "string" && typeof rec.date === "string" && typeof rec.status === "string";
    }) as AttendanceRecord[];
  } catch {
    return [];
  }
}

export function writeAttendanceRecords(groupId: string, records: AttendanceRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${groupId}`, JSON.stringify(records));
}

export function markAttendance(
  groupId: string,
  teacherId: string,
  date: string,
  statuses: Array<{ studentId: string; status: AttendanceStatus }>,
): AttendanceRecord[] {
  const existing = readAttendanceRecords(groupId);
  const existingByStudentDate = new Map<string, AttendanceRecord>();

  for (const record of existing) {
    existingByStudentDate.set(`${record.studentId}:${record.date}`, record);
  }

  for (const entry of statuses) {
    const key = `${entry.studentId}:${date}`;
    const record: AttendanceRecord = {
      id: existingByStudentDate.get(key)?.id ?? makeId("att"),
      studentId: entry.studentId,
      groupId,
      date,
      status: entry.status,
      teacherId,
      createdAt: existingByStudentDate.get(key)?.createdAt ?? new Date().toISOString(),
    };
    existingByStudentDate.set(key, record);
  }

  const all = [...existingByStudentDate.values()];
  writeAttendanceRecords(groupId, all);
  return all;
}

export function getStudentAttendanceRate(studentId: string, groupId: string): number {
  const records = readAttendanceRecords(groupId).filter((r) => r.studentId === studentId);
  if (records.length === 0) return 0;
  const presentCount = records.filter((r) => r.status === "present" || r.status === "late").length;
  return Math.round((presentCount / records.length) * 100);
}

export function getAttendanceForDate(groupId: string, date: string): AttendanceRecord[] {
  return readAttendanceRecords(groupId).filter((r) => r.date === date);
}

export function getDistinctAttendanceDates(groupId: string): string[] {
  const records = readAttendanceRecords(groupId);
  return [...new Set(records.map((r) => r.date))].sort().reverse();
}
