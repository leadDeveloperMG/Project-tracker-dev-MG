import { describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  it("redacts secret-like fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.info("auth.succeeded", { password: "Password123!", email: "pm@tracker.local" });
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("Password123!");
    expect(line).toContain("pm@tracker.local");
    spy.mockRestore();
  });
});
