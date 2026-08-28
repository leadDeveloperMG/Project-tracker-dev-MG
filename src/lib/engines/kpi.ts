import { CALCULATION_VERSION, SCORE_LABELS, type KpiDirection, type Rag } from "@/lib/constants";

export const OPERATIONAL_KPI_KEYS = ["ticket_count", "story_points"] as const;

export function isOperationalKpi(key: string) {
  return (OPERATIONAL_KPI_KEYS as readonly string[]).includes(key);
}

export type ThresholdBands = { green: number; amber: number; red?: number };

export type KpiDefinition = {
  key: string;
  name: string;
  direction: KpiDirection;
  target: number;
  weight: number;
  thresholdBands: ThresholdBands;
  minSampleSize?: number;
  qualityGuardrail?: { metric: "first_pass_acceptance" | "rework_rate"; min?: number; max?: number };
};

export type KpiActual = {
  value: number | null;
  sampleSize: number;
  excluded?: boolean;
  exclusionReason?: string;
};

export type KpiScoreResult = {
  actual: number | null;
  target: number;
  achievementPct: number | null;
  score: number | null;
  scoreLabel: string | null;
  rag: Rag | "insufficient";
  insufficientData: boolean;
  guardrailApplied: boolean;
  calculationVersion: string;
  formulaKey: string;
};

export function achievementPercent(actual: number, target: number, direction: KpiDirection): number {
  if (target === 0) {
    if (direction === "lower-is-better") return actual === 0 ? 120 : 0;
    return actual > 0 ? 120 : 100;
  }
  if (direction === "lower-is-better") {
    if (actual === 0) return 120;
    return (target / actual) * 100;
  }
  if (direction === "range") {
    const delta = Math.abs(actual - target);
    return Math.max(0, 100 - (delta / Math.abs(target)) * 100);
  }
  return (actual / target) * 100;
}

export function mapAchievementToScore(achievementPct: number): number {
  if (achievementPct >= 120) return 5;
  if (achievementPct >= 105) return 4;
  if (achievementPct >= 90) return 3;
  if (achievementPct >= 75) return 2;
  return 1;
}

export function ragFromValue(value: number, direction: KpiDirection, bands: ThresholdBands): Rag {
  if (direction === "lower-is-better") {
    if (value <= bands.green) return "green";
    if (value <= bands.amber) return "amber";
    return "red";
  }
  if (value >= bands.green) return "green";
  if (value >= bands.amber) return "amber";
  return "red";
}

export function scoreKpi(def: KpiDefinition, actual: KpiActual, quality?: { firstPassAcceptance?: number; reworkRate?: number }): KpiScoreResult {
  const minSample = def.minSampleSize ?? 0;
  if (actual.excluded) {
    return {
      actual: actual.value,
      target: def.target,
      achievementPct: actual.value == null ? null : Math.round(achievementPercent(actual.value, def.target, def.direction) * 10) / 10,
      score: null,
      scoreLabel: null,
      rag: "insufficient",
      insufficientData: true,
      guardrailApplied: false,
      calculationVersion: CALCULATION_VERSION,
      formulaKey: def.key,
    };
  }
  if (actual.value == null || actual.sampleSize < minSample) {
    return {
      actual: actual.value,
      target: def.target,
      achievementPct: null,
      score: null,
      scoreLabel: null,
      rag: "insufficient",
      insufficientData: true,
      guardrailApplied: false,
      calculationVersion: CALCULATION_VERSION,
      formulaKey: def.key,
    };
  }

  const achievement = achievementPercent(actual.value, def.target, def.direction);
  let score = mapAchievementToScore(achievement);
  let guardrailApplied = false;
  if (def.qualityGuardrail && score >= 4) {
    if (
      def.qualityGuardrail.metric === "first_pass_acceptance" &&
      def.qualityGuardrail.min != null &&
      (quality?.firstPassAcceptance ?? 100) < def.qualityGuardrail.min
    ) {
      score = 3;
      guardrailApplied = true;
    }
    if (
      def.qualityGuardrail.metric === "rework_rate" &&
      def.qualityGuardrail.max != null &&
      (quality?.reworkRate ?? 0) > def.qualityGuardrail.max
    ) {
      score = 3;
      guardrailApplied = true;
    }
  }

  return {
    actual: actual.value,
    target: def.target,
    achievementPct: Math.round(achievement * 10) / 10,
    score,
    scoreLabel: SCORE_LABELS[score],
    rag: ragFromValue(actual.value, def.direction, def.thresholdBands),
    insufficientData: false,
    guardrailApplied,
    calculationVersion: CALCULATION_VERSION,
    formulaKey: def.key,
  };
}

export function weightedKraScore(kpis: { score: number | null; weight: number; insufficientData: boolean }[]): {
  score: number | null;
  insufficientData: boolean;
} {
  const usable = kpis.filter((k) => k.score != null && !k.insufficientData);
  if (!usable.length) return { score: null, insufficientData: true };
  const totalWeight = usable.reduce((s, k) => s + k.weight, 0) || 1;
  const score = usable.reduce((s, k) => s + (k.score as number) * k.weight, 0) / totalWeight;
  return { score: Math.round(score * 100) / 100, insufficientData: false };
}

export function overallScore(kras: { score: number | null; weight: number }[]): number | null {
  const usable = kras.filter((k) => k.score != null);
  if (!usable.length) return null;
  const totalWeight = usable.reduce((s, k) => s + k.weight, 0) || 1;
  return Math.round((usable.reduce((s, k) => s + (k.score as number) * k.weight, 0) / totalWeight) * 100) / 100;
}

export function assertWeightsTotal100(weights: number[], label: string, allowException = false) {
  const total = Math.round(weights.reduce((s, w) => s + w, 0) * 10) / 10;
  if (Math.abs(total - 100) > 0.11 && !allowException) {
    throw new Error(`${label} weights must total 100% (got ${total}%)`);
  }
}

export type WorkSnapshot = {
  type: string;
  status: string;
  projectId?: string | null;
  dueDate?: Date | string | null;
  actualDate?: Date | string | null;
  baselineDate?: Date | string | null;
  committed?: boolean;
  firstPassAccepted?: boolean;
  reworkCount?: number;
  reviewed?: boolean;
  blockerOpenedAt?: Date | string | null;
  blockerResolvedAt?: Date | string | null;
  riskExposure?: number;
  ownerId?: string | null;
  assigneeId?: string | null;
  plannedEffort?: number | null;
};

export function computeFormula(
  key: string,
  items: WorkSnapshot[],
  extras?: { statusReportsOnTime?: number; statusReportsRequired?: number; stakeholderSatisfaction?: number | null },
): KpiActual {
  const deliverables = items.filter((i) => i.type === "Deliverable");
  const dueDeliverables = deliverables.filter((i) => i.dueDate);
  const acceptedOnTime = dueDeliverables.filter((i) => {
    if (i.status !== "Accepted" && i.status !== "Closed") return false;
    if (!i.actualDate || !i.dueDate) return false;
    return new Date(i.actualDate).getTime() <= new Date(i.dueDate).getTime();
  }).length;

  const milestones = items.filter((i) => i.type === "Milestone");
  const dueMilestones = milestones.filter((i) => i.baselineDate || i.dueDate);
  const milestonesOnTime = dueMilestones.filter((i) => {
    const baseline = i.baselineDate || i.dueDate;
    if (!baseline || !i.actualDate) return false;
    return ["Done", "Closed", "Accepted"].includes(i.status) && new Date(i.actualDate) <= new Date(baseline);
  }).length;

  const committed = items.filter((i) => i.committed);
  const committedDone = committed.filter((i) => ["Done", "Accepted", "Closed", "Implemented"].includes(i.status));

  const reviewed = deliverables.filter((i) => i.reviewed || ["Accepted", "Rejected", "Rework Required", "Closed"].includes(i.status));
  const firstPass = reviewed.filter((i) => i.firstPassAccepted && i.reworkCount === 0).length;
  const rework = reviewed.filter((i) => (i.reworkCount ?? 0) > 0).length;

  const blockers = items.filter((i) => i.blockerOpenedAt);
  const resolvedHours =
    blockers
      .filter((i) => i.blockerResolvedAt)
      .map((i) => (new Date(i.blockerResolvedAt as Date).getTime() - new Date(i.blockerOpenedAt as Date).getTime()) / 36e5)
      .reduce((s, n) => s + n, 0) / (blockers.filter((i) => i.blockerResolvedAt).length || 1);

  const openRiskExposure = items.filter((i) => i.type === "Risk" && !["Closed", "Accepted"].includes(i.status)).reduce((s, i) => s + (i.riskExposure ?? 0), 0);

  switch (key) {
    case "on_time_deliverable_rate":
      return { value: dueDeliverables.length ? (acceptedOnTime / dueDeliverables.length) * 100 : null, sampleSize: dueDeliverables.length };
    case "milestone_adherence":
      return { value: dueMilestones.length ? (milestonesOnTime / dueMilestones.length) * 100 : null, sampleSize: dueMilestones.length };
    case "commitment_completion":
      return { value: committed.length ? (committedDone.length / committed.length) * 100 : null, sampleSize: committed.length };
    case "first_pass_acceptance":
      return { value: reviewed.length ? (firstPass / reviewed.length) * 100 : null, sampleSize: reviewed.length };
    case "rework_rate":
      return { value: reviewed.length ? (rework / reviewed.length) * 100 : null, sampleSize: reviewed.length };
    case "blocker_resolution_time":
      return { value: blockers.filter((i) => i.blockerResolvedAt).length ? resolvedHours : null, sampleSize: blockers.length };
    case "status_report_compliance":
      return {
        value: extras?.statusReportsRequired
          ? ((extras.statusReportsOnTime ?? 0) / extras.statusReportsRequired) * 100
          : null,
        sampleSize: extras?.statusReportsRequired ?? 0,
      };
    case "stakeholder_satisfaction":
      return { value: extras?.stakeholderSatisfaction ?? null, sampleSize: extras?.stakeholderSatisfaction != null ? 1 : 0 };
    case "high_risk_exposure":
      return { value: openRiskExposure, sampleSize: items.filter((i) => i.type === "Risk").length };
    case "ticket_count":
      return {
        value: items.filter((i) => ["Task", "Sub-task", "Issue"].includes(i.type)).length,
        sampleSize: items.length,
      };
    case "story_points":
      return {
        value: items.reduce((sum, i) => sum + (i.plannedEffort ?? 0), 0),
        sampleSize: items.filter((i) => i.plannedEffort != null).length,
      };
    default:
      return { value: null, sampleSize: 0 };
  }
}

export function scoreFromManualActual(
  def: KpiDefinition,
  actualValue: number,
  sampleSize: number,
  quality?: { firstPassAcceptance?: number; reworkRate?: number },
) {
  return scoreKpi(def, { value: actualValue, sampleSize: Math.max(sampleSize, def.minSampleSize ?? 0) }, quality);
}
