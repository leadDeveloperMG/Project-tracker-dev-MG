import { describe, expect, it } from "vitest";
import { applyPublicOriginEnv, isLoopbackOrigin, resolvePublicOrigin, type PublicOriginEnv } from "./app-url";

describe("resolvePublicOrigin", () => {
  it("keeps localhost for local development", () => {
    expect(resolvePublicOrigin({ AUTH_URL: "http://localhost:3000" })).toBe("http://localhost:3000");
  });

  it("uses the Vercel production domain instead of localhost", () => {
    expect(
      resolvePublicOrigin({
        VERCEL: "1",
        VERCEL_ENV: "production",
        VERCEL_URL: "project-git-main-team.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "tracker.macrogen.example",
        AUTH_URL: "http://localhost:3000",
        APP_URL: "http://localhost:3000",
      }),
    ).toBe("https://tracker.macrogen.example");
  });

  it("uses the preview deployment host on Vercel preview", () => {
    expect(
      resolvePublicOrigin({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        VERCEL_URL: "project-git-feat-team.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "tracker.macrogen.example",
      }),
    ).toBe("https://project-git-feat-team.vercel.app");
  });

  it("honors an explicit non-local AUTH_URL on Vercel", () => {
    expect(
      resolvePublicOrigin({
        VERCEL: "1",
        VERCEL_ENV: "production",
        VERCEL_URL: "project.vercel.app",
        AUTH_URL: "https://app.macrogen.com",
      }),
    ).toBe("https://app.macrogen.com");
  });
});

describe("applyPublicOriginEnv", () => {
  it("overwrites localhost AUTH_URL when running on Vercel", () => {
    const env: PublicOriginEnv = {
      VERCEL: "1",
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "macrogen.vercel.app",
      AUTH_URL: "http://localhost:3000",
    };
    expect(applyPublicOriginEnv(env)).toBe("https://macrogen.vercel.app");
    expect(env.AUTH_URL).toBe("https://macrogen.vercel.app");
    expect(env.APP_URL).toBe("https://macrogen.vercel.app");
  });
});

describe("isLoopbackOrigin", () => {
  it("detects loopback hosts", () => {
    expect(isLoopbackOrigin("http://localhost:3000")).toBe(true);
    expect(isLoopbackOrigin("https://macrogen.vercel.app")).toBe(false);
  });
});
