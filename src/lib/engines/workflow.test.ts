import { describe, expect, it } from "vitest";
import { canMoveProjectToInProgress, canTransition } from "./workflow";

describe("workflow engine", () => {
  it("blocks Ready for Review without owner, due date, criteria, or evidence", () => {
    const base = {
      type: "Deliverable" as const,
      status: "In Progress",
      actorId: "a1",
      ownerId: "o1",
      hasOwner: false,
      hasDueDate: true,
      hasAcceptanceCriteria: true,
      hasEvidence: true,
    };
    expect(canTransition(base, "Ready for Review").ok).toBe(false);
    expect(canTransition({ ...base, hasOwner: true, hasDueDate: false }, "Ready for Review").ok).toBe(false);
    expect(
      canTransition({ ...base, hasOwner: true, hasAcceptanceCriteria: false }, "Ready for Review").ok,
    ).toBe(false);
    expect(canTransition({ ...base, hasOwner: true, hasEvidence: false }, "Ready for Review").ok).toBe(false);
    expect(canTransition({ ...base, hasOwner: true }, "Ready for Review").ok).toBe(true);
  });

  it("prevents owners from accepting their own deliverable", () => {
    const result = canTransition(
      {
        type: "Deliverable",
        status: "Ready for Review",
        actorId: "owner",
        ownerId: "owner",
        approverId: "owner",
        actorRole: "team_lead",
      },
      "Accepted",
    );
    expect(result.ok).toBe(false);
    const allowed = canTransition(
      {
        type: "Deliverable",
        status: "Ready for Review",
        actorId: "lead",
        ownerId: "owner",
        approverId: "lead",
        actorRole: "team_lead",
      },
      "Accepted",
    );
    expect(allowed.ok).toBe(true);
  });

  it("requires comments and corrective action for rework", () => {
    const missing = canTransition(
      {
        type: "Deliverable",
        status: "Ready for Review",
        actorId: "lead",
        actorRole: "team_lead",
        comments: "",
        correctiveAction: "",
      },
      "Rework Required",
    );
    expect(missing.ok).toBe(false);
    const ok = canTransition(
      {
        type: "Deliverable",
        status: "Ready for Review",
        actorId: "lead",
        actorRole: "team_lead",
        comments: "Gaps in evidence",
        correctiveAction: "Add test report",
      },
      "Rework Required",
    );
    expect(ok.ok).toBe(true);
  });

  it("enforces BRULE-01 for In Progress", () => {
    expect(canMoveProjectToInProgress({}).ok).toBe(false);
    expect(
      canMoveProjectToInProgress({
        managerId: "m",
        sponsorId: "s",
        startDate: new Date(),
        targetEndDate: new Date(),
        hasMilestonePlan: true,
      }).ok,
    ).toBe(true);
  });
});
