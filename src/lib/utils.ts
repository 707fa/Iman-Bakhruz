import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UZ_COUNTRY_CODE = "998";

function extractUzLocalDigits(value: string): string {
  const raw = value.trim();
  const hasPlusPrefix = raw.startsWith("+");
  let digits = raw.replace(/\D+/g, "");

  if (digits.startsWith(UZ_COUNTRY_CODE)) {
    digits = digits.slice(UZ_COUNTRY_CODE.length);
  } else if (hasPlusPrefix) {
    // If user edits +998 manually (e.g. +99...), do not leak partial country code
    // into local part. Keep only local digits.
    if (digits.length <= 3) {
      digits = "";
    } else if (digits.length > 9) {
      digits = digits.slice(-9);
    }
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length > 9) {
    digits = digits.slice(-9);
  }

  return digits.slice(0, 9);
}

export function formatUzPhoneInput(value: string): string {
  const local = extractUzLocalDigits(value);

  const part1 = local.slice(0, 2);
  const part2 = local.slice(2, 5);
  const part3 = local.slice(5, 7);
  const part4 = local.slice(7, 9);

  const formatted = [part1, part2, part3, part4].filter(Boolean).join("-");
  return `+${UZ_COUNTRY_CODE}${formatted ? ` ${formatted}` : ""}`;
}

export function toPhone(value: string): string {
  const local = extractUzLocalDigits(value);
  if (local.length !== 9) return "";
  return `+${UZ_COUNTRY_CODE}${local}`;
}

export function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
