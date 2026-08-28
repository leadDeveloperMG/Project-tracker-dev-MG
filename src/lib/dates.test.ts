import { describe, expect, it } from "vitest";
import { currentQuarterBounds } from "./dates";

describe("dates", () => {
  it("returns the calendar quarter containing the given date", () => {
    const { start, end } = currentQuarterBounds(new Date(2026, 7, 27));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(6);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(8);
    expect(end.getDate()).toBe(30);
  });
});
