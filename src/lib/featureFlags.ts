const ONLY_SUPPORT_AND_RATINGS_ENABLED = true;
const FULL_ACCESS_STUDENT_PHONES = new Set(["998978778177"]);

export function normalizePhone(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isFullAccessStudent(phone: string | undefined): boolean {
  if (FULL_ACCESS_STUDENT_PHONES.has(normalizePhone(phone))) return true;
  if (typeof window !== "undefined") {
    try {
      const mock = JSON.parse(window.localStorage.getItem("iman-quickpay-mock-v1") ?? "null");
      if (mock && mock.paid) return true;
    } catch { /* ignore */ }
  }
  return false;
}

export { ONLY_SUPPORT_AND_RATINGS_ENABLED };
