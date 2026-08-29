import { describe, expect, it } from "vitest";
import { validatePassword } from "./password";

describe("validatePassword", () => {
  it("accepts the demo password", () => {
    expect(validatePassword("Password123!")).toBeNull();
  });

  it("explains how to fix weak passwords", () => {
    expect(validatePassword("short")).toMatch(/at least 10/i);
    expect(validatePassword("alllowercase1")).toMatch(/uppercase/i);
    expect(validatePassword("ALLUPPERCASE1")).toMatch(/lowercase/i);
    expect(validatePassword("NoNumbersHere")).toMatch(/number/i);
  });
});
