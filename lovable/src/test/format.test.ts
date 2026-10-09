import { describe, expect, it } from "vitest";
import { baselinePeriod, fmtTime, fmtDateTime } from "@/lib/format";
describe("UTC display", () => {
  it("normalizes offsets and includes dates across midnight", () => {
    expect(fmtTime("2026-10-01T00:30:00+02:00")).toBe("22:30:00");
    expect(fmtDateTime("2026-10-01T00:30:00+02:00")).toBe("2026-09-30 22:30:00 UTC");
    expect(fmtDateTime("invalid")).toBe("—");
  });
  it("reports the actual sample span", () => {
    expect(baselinePeriod([{ day: "2026-09-30T17:20:10Z" }, { day: "2026-09-30T23:50:10Z" }])).toBe(
      "2 training samples · 6h 30m span · UTC",
    );
  });
});
