import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function todayISO(): string {
  return new Date().toISOString();
}

/** "Today", "Yesterday", "3 days ago", "Mar 4" - never a raw timestamp. */
export function relativeDay(iso?: string): string {
  if (!iso) return "Never";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "Never";
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(then)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function daysSince(iso?: string): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - then) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function formatTemp(tempC: number, units: "C" | "F"): string {
  return units === "C" ? `${Math.round(tempC)}°C` : `${cToF(tempC)}°F`;
}

/** Deterministic small hash, used for stable "random" picks. */
export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function currentSeason(date = new Date()): "Spring" | "Summer" | "Fall" | "Winter" {
  const month = date.getMonth();
  if (month <= 1 || month === 11) return "Winter";
  if (month <= 4) return "Spring";
  if (month <= 7) return "Summer";
  return "Fall";
}

export function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
