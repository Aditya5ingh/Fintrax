import { expect, it } from "vitest";
import {
  monthLabel,
  shiftMonth,
  dateInMonth,
  monthSchema,
} from "@/lib/monthly";
it("handles month names, year transitions and the date of a new entry", () => {
  expect(monthLabel("2026-11")).toBe("November 2026");
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftMonth("2027-01", -1)).toBe("2026-12");
  expect(shiftMonth("1900-01", -1)).toBe("1900-01");
  expect(shiftMonth("9999-12", 1)).toBe("9999-12");
  expect(dateInMonth("2026-12", "2026-11-23")).toBe("2026-12-01");
  expect(dateInMonth("2026-11", "2026-11-23")).toBe("2026-11-23");
  expect(monthSchema.safeParse("2026-13").success).toBe(false);
});
