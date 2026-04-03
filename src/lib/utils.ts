import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toPhone(value: string): string {
  const digits = value.replace(/\D+/g, "");
  if (!digits) return "";

  // Normalize common local formats for UZ numbers to a stable E.164 shape.
  if (digits.length === 9) {
    return `+998${digits}`;
  }

  if (digits.length === 10 && digits.startsWith("0")) {
    return `+998${digits.slice(1)}`;
  }

  return `+${digits}`;
}

export function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
