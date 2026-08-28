import { describe, expect, it } from "vitest";
import { assessmentWeightsOk, clampScore, weightedAssessmentScore } from "./assessment";
import { ASSESSMENT_DIMENSIONS } from "@/lib/constants";

describe("assessment engine", () => {
  it("clamps scores to the 1-5 scale", () => {
    expect(clampScore(0)).toBe(1);
    expect(clampScore(9)).toBe(5);
    expect(clampScore(3.4)).toBe(3);
  });

  it("computes a weighted deliverable score from default dimensions", () => {
    const dimensions = ASSESSMENT_DIMENSIONS.map((d) => ({
      key: d.key,
      label: d.label,
      weight: d.weight,
      score: d.key === "quality" ? 5 : 3,
    }));
    expect(assessmentWeightsOk(dimensions)).toBe(true);
    expect(weightedAssessmentScore(dimensions)).toBe(3.5);
  });
});
