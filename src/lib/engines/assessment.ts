import { ASSESSMENT_DIMENSIONS } from "@/lib/constants";

export type AssessmentDimensionInput = {
  key: string;
  label: string;
  weight: number;
  score: number;
  comments?: string;
  evidenceUrl?: string;
};

export function clampScore(value: number) {
  if (Number.isNaN(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function weightedAssessmentScore(dimensions: AssessmentDimensionInput[]) {
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
  if (!totalWeight) return 0;
  const earned = dimensions.reduce((sum, d) => sum + clampScore(d.score) * d.weight, 0);
  return Math.round((earned / totalWeight) * 100) / 100;
}

export function buildDefaultAssessmentDimensions(form: {
  get: (name: string) => FormDataEntryValue | null;
}): AssessmentDimensionInput[] {
  return ASSESSMENT_DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    weight: d.weight,
    score: clampScore(Number(form.get(`score_${d.key}`) ?? 3)),
    comments: String(form.get(`comment_${d.key}`) ?? ""),
    evidenceUrl: String(form.get(`evidence_${d.key}`) ?? "") || undefined,
  }));
}

export function assessmentWeightsOk(dimensions: AssessmentDimensionInput[]) {
  const total = dimensions.reduce((sum, d) => sum + d.weight, 0);
  return Math.abs(total - 100) < 0.11;
}
