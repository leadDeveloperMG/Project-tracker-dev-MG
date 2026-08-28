import { describe, expect, it } from "vitest";
import { achievementPercent, mapAchievementToScore, scoreKpi, computeFormula, weightedKraScore, isOperationalKpi } from "./kpi";

describe("kpi engine", () => {
  it("maps higher-is-better achievement to the 1-5 scale", () => {
    expect(mapAchievementToScore(120)).toBe(5);
    expect(mapAchievementToScore(110)).toBe(4);
    expect(mapAchievementToScore(95)).toBe(3);
    expect(mapAchievementToScore(80)).toBe(2);
    expect(mapAchievementToScore(50)).toBe(1);
  });

  it("reverses achievement for lower-is-better metrics", () => {
    expect(achievementPercent(5, 10, "lower-is-better")).toBe(200);
    expect(achievementPercent(20, 10, "lower-is-better")).toBe(50);
    expect(achievementPercent(90, 90, "higher-is-better")).toBe(100);
  });

  it("labels insufficient data when sample size is below the rule", () => {
    const result = scoreKpi(
      {
        key: "on_time_deliverable_rate",
        name: "On-time",
        direction: "higher-is-better",
        target: 90,
        weight: 100,
        thresholdBands: { green: 90, amber: 80 },
        minSampleSize: 3,
      },
      { value: 100, sampleSize: 1 },
    );
    expect(result.insufficientData).toBe(true);
    expect(result.score).toBeNull();
    expect(result.rag).toBe("insufficient");
  });

  it("applies quality guardrails that cap high ratings", () => {
    const result = scoreKpi(
      {
        key: "on_time_deliverable_rate",
        name: "On-time",
        direction: "higher-is-better",
        target: 90,
        weight: 100,
        thresholdBands: { green: 90, amber: 80 },
        minSampleSize: 1,
        qualityGuardrail: { metric: "rework_rate", max: 10 },
      },
      { value: 110, sampleSize: 5 },
      { reworkRate: 25 },
    );
    expect(result.score).toBe(3);
    expect(result.guardrailApplied).toBe(true);
  });

  it("computes on-time deliverable rate from work snapshots", () => {
    const actual = computeFormula("on_time_deliverable_rate", [
      {
        type: "Deliverable",
        status: "Accepted",
        dueDate: "2026-01-10",
        actualDate: "2026-01-09",
      },
      {
        type: "Deliverable",
        status: "Accepted",
        dueDate: "2026-01-10",
        actualDate: "2026-01-12",
      },
    ]);
    expect(actual.sampleSize).toBe(2);
    expect(actual.value).toBe(50);
  });

  it("weights KRA scores from linked KPIs", () => {
    const kra = weightedKraScore([
      { score: 4, weight: 60, insufficientData: false },
      { score: 2, weight: 40, insufficientData: false },
    ]);
    expect(kra.score).toBe(3.2);
  });

  it("treats policy exclusions as insufficient for formal scoring", () => {
    const result = scoreKpi(
      {
        key: "on_time_deliverable_rate",
        name: "On-time",
        direction: "higher-is-better",
        target: 90,
        weight: 100,
        thresholdBands: { green: 90, amber: 80 },
        minSampleSize: 1,
      },
      { value: 50, sampleSize: 4, excluded: true, exclusionReason: "Approved leave" },
    );
    expect(result.insufficientData).toBe(true);
    expect(result.score).toBeNull();
  });

  it("computes operational ticket counts separately from formal KPIs", () => {
    const actual = computeFormula("ticket_count", [
      { type: "Task", status: "Done" },
      { type: "Task", status: "To Do" },
      { type: "Deliverable", status: "Accepted" },
    ]);
    expect(actual.value).toBe(2);
    expect(isOperationalKpi("ticket_count")).toBe(true);
    expect(isOperationalKpi("story_points")).toBe(true);
    expect(isOperationalKpi("on_time_deliverable_rate")).toBe(false);
  });
});
