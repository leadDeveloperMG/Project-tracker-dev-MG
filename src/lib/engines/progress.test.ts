import { describe, expect, it } from "vitest";
import { calculateProgress, computeFlags } from "./progress";
import { recommendHealth, overallRag, applyOverride } from "./health";

describe("progress engine", () => {
  it("averages child completion", () => {
    expect(
      calculateProgress("child-item", [
        { progress: 100, status: "Done" },
        { progress: 0, status: "To Do" },
      ]),
    ).toBe(50);
  });

  it("uses weighted completion", () => {
    expect(
      calculateProgress("weighted-completion", [
        { progress: 100, weight: 3 },
        { progress: 0, weight: 1 },
      ]),
    ).toBe(75);
  });
});

describe("flags", () => {
  it("flags overdue unassigned work", () => {
    const flags = computeFlags({
      type: "Task",
      status: "In Progress",
      dueDate: new Date(Date.now() - 86400000),
      title: "Do thing",
    });
    expect(flags.overdue).toBe(true);
    expect(flags.unassigned).toBe(true);
  });
});

describe("health engine", () => {
  it("turns red when schedule and risk are poor", () => {
    const health = recommendHealth({
      overdueMilestones: 4,
      dueMilestones: 4,
      scheduleVarianceDays: 30,
      criticalBlockedDependencies: 2,
      completionRate: 20,
      overdueDeliverables: 5,
      commitmentCompletion: 20,
      unacceptedDeliverables: 4,
      firstPassAcceptance: 40,
      reworkRate: 40,
      assessmentScoreAvg: 2,
      openRiskExposure: 12,
      unassignedWork: 8,
      staleWork: 6,
      overdueStatusReports: 3,
      missingStakeholderUpdates: 2,
      scopeChangeRate: 8,
    });
    expect(overallRag(health)).toBe("red");
  });

  it("requires rationale for overrides", () => {
    const cell = { rag: "red" as const, source: "calculated" as const, score: 40 };
    expect(applyOverride(cell, "green", "").ok).toBe(false);
    expect(applyOverride(cell, "green", "Accepted delay from vendor").ok).toBe(true);
  });
});
