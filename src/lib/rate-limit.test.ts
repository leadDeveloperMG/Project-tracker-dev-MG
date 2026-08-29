import { describe, expect, it } from "vitest";
import { rateLimit, resetRateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("blocks after the configured number of attempts", () => {
    resetRateLimit("test");
    expect(rateLimit("test", 2, 60_000).ok).toBe(true);
    expect(rateLimit("test", 2, 60_000).ok).toBe(true);
    expect(rateLimit("test", 2, 60_000).ok).toBe(false);
  });
});
