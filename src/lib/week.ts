import { DAYS } from "@/lib/constants";

/** Returns the yyyy-mm-dd of the Monday for the week containing `base`. */
export function getWeekStart(base: Date = new Date(), offsetWeeks = 0): string {
  const d = new Date(
    Date.UTC(base.getFullYear(), base.getMonth(), base.getDate())
  );
  const day = d.getUTCDay(); // 0 = Sun ... 6 = Sat
  const diffToMonday = (day + 6) % 7; // 0 if Monday
  d.setUTCDate(d.getUTCDate() - diffToMonday + offsetWeeks * 7);
  return d.toISOString().slice(0, 10);
}

/** Adds `weeks` to a yyyy-mm-dd Monday string and returns the new Monday. */
export function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(weekStart + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

/** Human-readable label for a week, e.g. "Jun 30 – Jul 6, 2026". */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(end)}, ${end.getUTCFullYear()}`;
}

/** Date for a given day index (0 = Monday) within a week. */
export function dateForDay(weekStart: string, dayIndex: number): string {
  const d = new Date(weekStart + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dayIndex);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const DAY_NAMES = DAYS;
