import type { HealthDimension, Rag } from "@/lib/constants";

export type HealthInput = {
  overdueMilestones: number;
  dueMilestones: number;
  scheduleVarianceDays: number;
  criticalBlockedDependencies: number;
  completionRate: number;
  overdueDeliverables: number;
  commitmentCompletion: number;
  unacceptedDeliverables: number;
  firstPassAcceptance: number;
  reworkRate: number;
  assessmentScoreAvg: number | null;
  openRiskExposure: number;
  unassignedWork: number;
  staleWork: number;
  overdueStatusReports: number;
  missingStakeholderUpdates: number;
  scopeChangeRate: number;
};

export type HealthCell = {
  rag: Rag;
  source: "calculated" | "override";
  rationale?: string;
  score: number;
};

function ragFromScore(score: number): Rag {
  if (score >= 80) return "green";
  if (score >= 60) return "amber";
  return "red";
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

export function recommendHealth(input: HealthInput): Record<HealthDimension, HealthCell> {
  const schedulePenalty =
    input.overdueMilestones * 15 +
    Math.max(0, input.scheduleVarianceDays) * 2 +
    input.criticalBlockedDependencies * 20;
  const scheduleScore = clamp(100 - schedulePenalty);

  const deliveryScore = clamp(
    input.completionRate * 0.4 +
      input.commitmentCompletion * 0.4 +
      Math.max(0, 100 - input.overdueDeliverables * 12) * 0.1 +
      Math.max(0, 100 - input.unacceptedDeliverables * 10) * 0.1,
  );

  const qualityScore = clamp(
    (input.firstPassAcceptance || 0) * 0.45 +
      Math.max(0, 100 - input.reworkRate * 4) * 0.35 +
      (input.assessmentScoreAvg != null ? (input.assessmentScoreAvg / 5) * 100 : 70) * 0.2,
  );

  const riskScore = clamp(100 - input.openRiskExposure * 8);
  const resourceScore = clamp(100 - input.unassignedWork * 8 - input.staleWork * 5);
  const stakeholderScore = clamp(100 - input.overdueStatusReports * 15 - input.missingStakeholderUpdates * 10);
  const scopeScore = clamp(100 - input.scopeChangeRate * 10);

  const map: Record<HealthDimension, number> = {
    scope: scopeScore,
    schedule: scheduleScore,
    delivery: deliveryScore,
    quality: qualityScore,
    risks: riskScore,
    resources: resourceScore,
    stakeholders: stakeholderScore,
  };

  return Object.fromEntries(
    Object.entries(map).map(([key, score]) => [
      key,
      { rag: ragFromScore(score), source: "calculated" as const, score: Math.round(score) },
    ]),
  ) as Record<HealthDimension, HealthCell>;
}

export function overallRag(cells: Record<HealthDimension, HealthCell>): Rag {
  const values = Object.values(cells).map((c) => c.rag);
  if (values.includes("red")) return "red";
  if (values.includes("amber")) return "amber";
  return "green";
}

export function applyOverride(
  current: HealthCell,
  rag: Rag,
  rationale: string,
): { ok: true; cell: HealthCell } | { ok: false; error: string } {
  if (!rationale.trim()) {
    return { ok: false, error: "Health override requires a rationale (FR-031)" };
  }
  return { ok: true, cell: { ...current, rag, source: "override", rationale: rationale.trim() } };
}
