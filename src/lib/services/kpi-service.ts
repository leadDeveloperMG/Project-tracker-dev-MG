import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { StatusReport } from "@/models/assessment";
import { KpiCatalog, KpiResult, KraCatalog, Scorecard, ScorecardTemplate } from "@/models/kpi";
import { User, Team } from "@/models/user";
import { Project } from "@/models/project";
import { computeFormula, scoreKpi, weightedKraScore, overallScore, isOperationalKpi, type WorkSnapshot } from "@/lib/engines/kpi";
import { CALCULATION_VERSION } from "@/lib/constants";
import type { KpiDirection } from "@/lib/constants";

function toSnapshot(item: {
  type: string;
  status: string;
  dueDate?: Date | null;
  actualDate?: Date | null;
  baselineDate?: Date | null;
  committed?: boolean;
  firstPassAccepted?: boolean;
  reworkCount?: number;
  reviewed?: boolean;
  blockerOpenedAt?: Date | null;
  blockerResolvedAt?: Date | null;
  exposure?: number;
    plannedEffort?: number | null;
    assigneeId?: unknown;
    projectId?: unknown;
}): WorkSnapshot {
  return {
    type: item.type,
    projectId: item.projectId ? String(item.projectId) : null,
    status: item.status,
    dueDate: item.dueDate,
    actualDate: item.actualDate,
    baselineDate: item.baselineDate,
    committed: item.committed,
    firstPassAccepted: item.firstPassAccepted,
    reworkCount: item.reworkCount,
    reviewed: item.reviewed,
    blockerOpenedAt: item.blockerOpenedAt,
    blockerResolvedAt: item.blockerResolvedAt,
    riskExposure: item.exposure,
    assigneeId: item.assigneeId ? String(item.assigneeId) : null,
    plannedEffort: item.plannedEffort,
  };
}

export async function refreshKpiResults(periodStart: Date, periodEnd: Date) {
  await connectDB();
  const kpis = await KpiCatalog.find({ approvalStatus: "approved" });
  const items = await WorkItem.find({ deletedAt: null });
  const reports = await StatusReport.find({
    periodStart: { $gte: periodStart },
    periodEnd: { $lte: periodEnd },
  });
  const users = await User.find({ active: true });
  const teams = await Team.find({ active: true });
  const projects = await Project.find({ deletedAt: null });
  const cutoff = periodEnd;
  const refreshTimestamp = new Date();
  let count = 0;

  const subjects: {
    type: "member" | "team" | "project";
    id: string;
    filter: (s: WorkSnapshot) => boolean;
  }[] = [
    ...users.map((u) => ({
      type: "member" as const,
      id: String(u._id),
      filter: (s: WorkSnapshot) => s.assigneeId === String(u._id),
    })),
    ...teams.map((t) => ({
      type: "team" as const,
      id: String(t._id),
      filter: (s: WorkSnapshot) => t.memberIds.some((memberId: unknown) => String(memberId) === s.assigneeId),
    })),
    ...projects.map((p) => ({
      type: "project" as const,
      id: String(p._id),
      filter: (s: WorkSnapshot) => s.projectId === String(p._id),
    })),
  ];

  for (const subject of subjects) {
    const scopedItems = items.filter((i) => subject.filter(toSnapshot(i)));
    const scoped = scopedItems.map(toSnapshot);
    const scopedReports = reports.filter((r) => scopedItems.some((i) => String(i.projectId) === String(r.projectId)));
    const extras = {
      statusReportsOnTime: (subject.type === "project" ? scopedReports : reports).filter((r) => r.onTime).length,
      statusReportsRequired: Math.max((subject.type === "project" ? scopedReports : reports).length, 1),
      stakeholderSatisfaction: null as number | null,
    };
    const quality = {
      firstPassAcceptance: computeFormula("first_pass_acceptance", scoped).value ?? undefined,
      reworkRate: computeFormula("rework_rate", scoped).value ?? undefined,
    };
    for (const kpi of kpis) {
      if (kpi.ownerType !== subject.type) continue;
      const now = periodEnd;
      if (kpi.effectiveFrom && kpi.effectiveFrom > now) continue;
      if (kpi.effectiveTo && kpi.effectiveTo < periodStart) continue;
      const existing = await KpiResult.findOne({
        kpiId: kpi._id,
        subjectType: subject.type,
        subjectId: subject.id,
        periodStart,
      });
      if (existing && (existing.source === "override" || existing.source === "manual")) {
        continue;
      }
      const actual = computeFormula(kpi.key, scoped, extras);
      const scored = scoreKpi(
        {
          key: kpi.key,
          name: kpi.name,
          direction: kpi.direction as KpiDirection,
          target: kpi.target,
          weight: kpi.weight,
          thresholdBands: { green: kpi.thresholdBands.green, amber: kpi.thresholdBands.amber },
          minSampleSize: kpi.minSampleSize,
          qualityGuardrail: kpi.qualityGuardrail as never,
        },
        actual,
        quality,
      );
      await KpiResult.findOneAndUpdate(
        {
          kpiId: kpi._id,
          subjectType: subject.type,
          subjectId: subject.id,
          periodStart,
        },
        {
          kpiKey: kpi.key,
          periodEnd,
          actualValue: scored.actual,
          target: scored.target,
          achievementPct: scored.achievementPct,
          score: scored.score,
          rag: scored.rag,
          insufficientData: scored.insufficientData,
          source: "calculated",
          calculationVersion: CALCULATION_VERSION,
          cutoffDate: cutoff,
          refreshTimestamp,
          sampleSize: actual.sampleSize,
          guardrailApplied: scored.guardrailApplied,
        },
        { upsert: true, returnDocument: "after" },
      );
      count += 1;
    }
  }
  return count;
}

export async function buildScorecard(opts: {
  subjectType: "member" | "team" | "project";
  subjectId: string;
  role: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  await connectDB();
  const template = await ScorecardTemplate.findOne({ role: opts.role, approvalStatus: "approved" });
  if (!template) throw new Error("No approved scorecard template for this role");
  const kras = await KraCatalog.find({ _id: { $in: template.kraIds }, approvalStatus: "approved" });
  const results = await KpiResult.find({
    subjectId: opts.subjectId,
    periodStart: opts.periodStart,
  });
  const kraBlocks = [];
  for (const kra of kras) {
    const kpis = await KpiCatalog.find({
      kraId: kra._id,
      approvalStatus: "approved",
      ownerType: opts.subjectType,
    });
    const formal = kpis.filter((kpi) => !isOperationalKpi(kpi.key));
    if (formal.some((kpi) => kpi.approvalStatus !== "approved")) {
      throw new Error("Unapproved KPI definitions cannot be used in formal scorecards (FR-056)");
    }
    const linked = formal.map((kpi) => {
      const result = results.find((r) => String(r.kpiId) === String(kpi._id));
      return {
        score: result?.score ?? null,
        weight: kpi.weight,
        insufficientData: result?.insufficientData ?? true,
        id: result?._id,
      };
    });
    const kraScore = weightedKraScore(linked);
    kraBlocks.push({
      kraId: kra._id,
      name: kra.name,
      weight: kra.weight,
      score: kraScore.score,
      kpiResultIds: linked.map((l) => l.id).filter(Boolean),
    });
  }
  const overall = overallScore(kraBlocks);
  const scorecard = await Scorecard.findOneAndUpdate(
    { subjectType: opts.subjectType, subjectId: opts.subjectId, periodStart: opts.periodStart },
    {
      role: opts.role,
      periodEnd: opts.periodEnd,
      dataCutoff: opts.periodEnd,
      kras: kraBlocks,
      overallScore: overall,
      lockStatus: "open",
      approvalStatus: "draft",
    },
    { upsert: true, returnDocument: "after" },
  );
  return scorecard;
}
