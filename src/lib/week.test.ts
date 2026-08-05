import { describe, expect, it } from "vitest";
import {
  dateForDay,
  formatWeekRange,
  getWeekStart,
  shiftWeek,
} from "@/lib/week";

/** Local-midnight date, so the helpers read the same calendar day in any zone. */
function on(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe("getWeekStart", () => {
  it("returns the Monday of the containing week", () => {
    // Aug 3 2026 is a Monday, Aug 9 the Sunday that closes the same week.
    expect(getWeekStart(on(2026, 8, 3))).toBe("2026-08-03");
    expect(getWeekStart(on(2026, 8, 5))).toBe("2026-08-03");
    expect(getWeekStart(on(2026, 8, 9))).toBe("2026-08-03");
  });

  it("treats Sunday as the end of the week, not the start", () => {
    expect(getWeekStart(on(2026, 8, 9))).not.toBe("2026-08-09");
    expect(getWeekStart(on(2026, 8, 10))).toBe("2026-08-10");
  });

  it("applies a week offset", () => {
    expect(getWeekStart(on(2026, 8, 5), 1)).toBe("2026-08-10");
    expect(getWeekStart(on(2026, 8, 5), -1)).toBe("2026-07-27");
    expect(getWeekStart(on(2026, 8, 5), 4)).toBe("2026-08-31");
  });

  it("crosses month and year boundaries", () => {
    // Jan 1 2027 is a Friday, so its week starts in December.
    expect(getWeekStart(on(2027, 1, 1))).toBe("2026-12-28");
  });
});

describe("shiftWeek", () => {
  it("moves forward and back by whole weeks", () => {
    expect(shiftWeek("2026-08-03", 1)).toBe("2026-08-10");
    expect(shiftWeek("2026-08-03", -1)).toBe("2026-07-27");
    expect(shiftWeek("2026-08-03", 0)).toBe("2026-08-03");
  });

  it("crosses a year boundary", () => {
    expect(shiftWeek("2026-12-28", 1)).toBe("2027-01-04");
    expect(shiftWeek("2027-01-04", -1)).toBe("2026-12-28");
  });

  it("round-trips any offset", () => {
    for (const weeks of [1, 5, 26, 52]) {
      expect(shiftWeek(shiftWeek("2026-08-03", weeks), -weeks)).toBe(
        "2026-08-03"
      );
    }
  });
});

describe("dateForDay", () => {
  it("maps day 0 to Monday and day 6 to Sunday", () => {
    expect(dateForDay("2026-08-03", 0)).toBe("Aug 3");
    expect(dateForDay("2026-08-03", 6)).toBe("Aug 9");
  });

  it("rolls into the next month mid-week", () => {
    // Aug 31 2026 is a Monday, so the week runs into September.
    expect(dateForDay("2026-08-31", 0)).toBe("Aug 31");
    expect(dateForDay("2026-08-31", 1)).toBe("Sep 1");
  });
});

describe("formatWeekRange", () => {
  it("shows the Monday to Sunday span with the year", () => {
    expect(formatWeekRange("2026-08-03")).toBe("Aug 3 – Aug 9, 2026");
  });

  it("spans two months", () => {
    expect(formatWeekRange("2026-08-31")).toBe("Aug 31 – Sep 6, 2026");
  });

  it("labels a year-crossing week with the year it ends in", () => {
    expect(formatWeekRange("2026-12-28")).toBe("Dec 28 – Jan 3, 2027");
  });
});
