const ONLY_SUPPORT_AND_RATINGS_ENABLED = true;
const FULL_ACCESS_STUDENT_PHONES = new Set(["998978778177"]);

export function normalizePhone(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isFullAccessStudent(
  phone: string | undefined,
  sessionPaid?: boolean,
): boolean {
  if (sessionPaid) return true;
  if (FULL_ACCESS_STUDENT_PHONES.has(normalizePhone(phone))) return true;
  return false;
}

export { ONLY_SUPPORT_AND_RATINGS_ENABLED };
