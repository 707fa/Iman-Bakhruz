const ONLY_SUPPORT_AND_RATINGS_ENABLED = true;
const FULL_ACCESS_STUDENT_PHONES = new Set(["998978778177"]);

export function normalizePhone(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isFullAccessStudent(phone: string | undefined): boolean {
  return FULL_ACCESS_STUDENT_PHONES.has(normalizePhone(phone));
}

export { ONLY_SUPPORT_AND_RATINGS_ENABLED };
