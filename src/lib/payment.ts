const PAYMENT_KEY = "farrux-course-paid-v1";

export interface PaymentState {
  paid: boolean;
  paidAt: string | null;
  method: string | null;
  amount: number | null;
}

export function getPaymentState(): PaymentState {
  if (typeof window === "undefined") return { paid: false, paidAt: null, method: null, amount: null };
  try {
    const raw = window.localStorage.getItem(PAYMENT_KEY);
    if (!raw) return { paid: false, paidAt: null, method: null, amount: null };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return { paid: false, paidAt: null, method: null, amount: null };
    const rec = parsed as Record<string, unknown>;
    return {
      paid: Boolean(rec.paid),
      paidAt: typeof rec.paidAt === "string" ? rec.paidAt : null,
      method: typeof rec.method === "string" ? rec.method : null,
      amount: typeof rec.amount === "number" ? rec.amount : null,
    };
  } catch {
    return { paid: false, paidAt: null, method: null, amount: null };
  }
}

export function savePaymentState(method: string, amount: number): void {
  if (typeof window === "undefined") return;
  const state: PaymentState = {
    paid: true,
    paidAt: new Date().toISOString(),
    method,
    amount,
  };
  window.localStorage.setItem(PAYMENT_KEY, JSON.stringify(state));
}

export function resetPaymentState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PAYMENT_KEY);
}

export const COURSE_PRICE = 499000;
export const COURSE_PRICE_USD = 49;
