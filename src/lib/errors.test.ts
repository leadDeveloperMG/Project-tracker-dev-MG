import { describe, expect, it } from "vitest";
import { AppError, toPublicError } from "./errors";

describe("toPublicError", () => {
  it("exposes AppError messages and hides unknown failures", () => {
    const exposed = toPublicError(new AppError("Name is required"), "TRK-1");
    expect(exposed.error).toBe("Name is required");
    const hidden = toPublicError(new Error("ECONNREFUSED mongodb://secret"), "TRK-2");
    expect(hidden.error).toContain("TRK-2");
    expect(hidden.error).not.toContain("mongodb");
    expect(hidden.error).not.toContain("ECONNREFUSED");
  });
});
