import { describe, expect, it } from "vitest";
import { canViewIndividualScorecard, hasPermission, postLoginPath } from "./rbac";

describe("rbac", () => {
  it("sends delivery roles to the personal dashboard after login", () => {
    expect(postLoginPath("project_manager")).toBe("/dashboard");
    expect(postLoginPath("team_lead")).toBe("/dashboard");
    expect(postLoginPath("team_member")).toBe("/dashboard");
  });

  it("sends executives and PMO to the portfolio", () => {
    expect(postLoginPath("executive")).toBe("/portfolio");
    expect(postLoginPath("pmo_admin")).toBe("/portfolio");
    expect(postLoginPath("system_admin")).toBe("/portfolio");
  });

  it("lets the subject, manager, and HR view an individual scorecard", () => {
    expect(
      canViewIndividualScorecard({
        viewerId: "m1",
        viewerRole: "team_member",
        subjectId: "m1",
        managerId: "lead1",
      }),
    ).toBe(true);
    expect(
      canViewIndividualScorecard({
        viewerId: "lead1",
        viewerRole: "team_lead",
        subjectId: "m1",
        managerId: "lead1",
      }),
    ).toBe(true);
    expect(
      canViewIndividualScorecard({
        viewerId: "exec1",
        viewerRole: "executive",
        subjectId: "m1",
        managerId: "lead1",
      }),
    ).toBe(false);
  });

  it("allows team leads to lock scorecards and record check-ins", () => {
    expect(hasPermission("team_lead", "lockScorecard")).toBe(true);
    expect(hasPermission("team_member", "lockScorecard")).toBe(false);
  });
});
