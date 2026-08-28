"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { canViewIndividualScorecard } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { KpiCatalog, KpiResult, Scorecard } from "@/models/kpi";
import { CheckIn, CalibrationRecord, AnnualReview } from "@/models/performance";
import { User } from "@/models/user";
import { writeAudit } from "@/models/audit";
import { buildScorecard, refreshKpiResults } from "@/lib/services/kpi-service";
import { scoreFromManualActual } from "@/lib/engines/kpi";
import type { KpiDirection } from "@/lib/constants";
import { runAction, type ActionState } from "@/lib/safe-action";

export async function refreshKpisAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "manageCatalog") && !hasPermission(user.role, "lockScorecard")) {
    throw new Error("Not allowed");
  }
  const periodStart = new Date(String(formData.get("periodStart")));
  const periodEnd = new Date(String(formData.get("periodEnd")));
  await refreshKpiResults(periodStart, periodEnd);
  revalidatePath("/scorecards");
}

export async function generateScorecardAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "lockScorecard")) throw new Error("Not allowed");
  const subjectId = String(formData.get("subjectId"));
  const role = String(formData.get("role"));
  const periodStart = new Date(String(formData.get("periodStart")));
  const periodEnd = new Date(String(formData.get("periodEnd")));
  await refreshKpiResults(periodStart, periodEnd);
  const scorecard = await buildScorecard({
    subjectType: "member",
    subjectId,
    role,
    periodStart,
    periodEnd,
  });
  revalidatePath("/scorecards");
  if (!scorecard) throw new Error("Could not save scorecard");
  redirect(`/scorecards/${scorecard._id}`);
}

export async function overrideKpiAction(resultId: string, formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "overrideKpi")) throw new Error("Not allowed");
  await connectDB();
  const result = await KpiResult.findById(resultId);
  if (!result) throw new Error("KPI result not found");
  const scorecard = await Scorecard.findOne({
    subjectId: result.subjectId,
    periodStart: result.periodStart,
    lockStatus: "locked",
  });
  if (scorecard) throw new Error("Locked scorecard periods cannot be changed except through audited correction (BRULE-09)");
  const reason = String(formData.get("reason") ?? "").trim();
  const evidence = String(formData.get("evidence") ?? "").trim();
  if (!reason || !evidence) throw new Error("Manual KPI overrides require a reason and evidence (BRULE-08)");
  const kpi = await KpiCatalog.findById(result.kpiId);
  if (!kpi || kpi.approvalStatus !== "approved") {
    throw new Error("Unapproved KPI definitions cannot be used in formal scorecards (FR-056)");
  }
  const actualValue = Number(formData.get("actualValue"));
  const scored = scoreFromManualActual(
    {
      key: kpi.key,
      name: kpi.name,
      direction: kpi.direction as KpiDirection,
      target: kpi.target,
      weight: kpi.weight,
      thresholdBands: { green: kpi.thresholdBands.green, amber: kpi.thresholdBands.amber },
      minSampleSize: 0,
      qualityGuardrail: kpi.qualityGuardrail as never,
    },
    actualValue,
    Math.max(result.sampleSize ?? 0, 1),
  );
  result.actualValue = scored.actual;
  result.achievementPct = scored.achievementPct;
  result.score = scored.score;
  result.rag = scored.rag;
  result.insufficientData = scored.insufficientData;
  result.guardrailApplied = scored.guardrailApplied;
  result.reason = reason;
  result.evidence = evidence;
  result.source = "override";
  result.approverId = user.id as never;
  result.exception = String(formData.get("exception") ?? "") || undefined;
  result.refreshTimestamp = new Date();
  await result.save();
  const openCard = await Scorecard.findOne({
    subjectId: result.subjectId,
    periodStart: result.periodStart,
  });
  if (openCard) {
    await buildScorecard({
      subjectType: openCard.subjectType as "member" | "team" | "project",
      subjectId: String(openCard.subjectId),
      role: openCard.role,
      periodStart: openCard.periodStart,
      periodEnd: openCard.periodEnd,
    });
  }
  await writeAudit({
    actorId: user.id,
    action: "kpi.override",
    entityType: "KpiResult",
    entityId: resultId,
    after: { actualValue: result.actualValue, score: result.score },
    reason,
  });
  revalidatePath("/scorecards");
}

export async function overrideKpiForm(resultId: string, _state: ActionState | undefined, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await overrideKpiAction(resultId, formData);
    return { message: "Override recorded with audit trail" };
  });
}

export async function generateTeamScorecardAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "lockScorecard")) throw new Error("Not allowed");
  const subjectId = String(formData.get("subjectId"));
  const periodStart = new Date(String(formData.get("periodStart")));
  const periodEnd = new Date(String(formData.get("periodEnd")));
  await refreshKpiResults(periodStart, periodEnd);
  const scorecard = await buildScorecard({
    subjectType: "team",
    subjectId,
    role: "team_lead",
    periodStart,
    periodEnd,
  });
  revalidatePath("/scorecards");
  if (!scorecard) throw new Error("Could not save scorecard");
  redirect(`/scorecards/${scorecard._id}`);
}

export async function generateProjectScorecardAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "lockScorecard")) throw new Error("Not allowed");
  const subjectId = String(formData.get("subjectId"));
  const periodStart = new Date(String(formData.get("periodStart")));
  const periodEnd = new Date(String(formData.get("periodEnd")));
  await refreshKpiResults(periodStart, periodEnd);
  const scorecard = await buildScorecard({
    subjectType: "project",
    subjectId,
    role: "project_manager",
    periodStart,
    periodEnd,
  });
  revalidatePath("/scorecards");
  if (!scorecard) throw new Error("Could not save scorecard");
  redirect(`/scorecards/${scorecard._id}`);
}

export async function approveScorecardAction(scorecardId: string, formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "lockScorecard")) throw new Error("Not allowed");
  await connectDB();
  const scorecard = await Scorecard.findById(scorecardId);
  if (!scorecard) throw new Error("Scorecard not found");
  const comments = String(formData.get("managerComments") ?? "");
  const qualitative = String(formData.get("qualitativeAssessment") ?? "");
  if (!comments.trim() || !qualitative.trim()) {
    throw new Error("A finalized rating must include manager comments and qualitative assessment (BRULE-15)");
  }
  scorecard.managerComments = comments;
  scorecard.qualitativeAssessment = qualitative;
  scorecard.approvalStatus = "approved";
  scorecard.lockStatus = "locked";
  scorecard.reviewerId = user.id as never;
  scorecard.approvedAt = new Date();
  await scorecard.save();
  await writeAudit({
    actorId: user.id,
    action: "scorecard.approve",
    entityType: "Scorecard",
    entityId: scorecardId,
  });
  revalidatePath(`/scorecards/${scorecardId}`);
}

export async function correctScorecardAction(scorecardId: string, formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "correctLockedScorecard")) throw new Error("Not allowed");
  await connectDB();
  const scorecard = await Scorecard.findById(scorecardId);
  if (!scorecard) throw new Error("Scorecard not found");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Authorized corrections require a reason");
  scorecard.lockStatus = "open";
  scorecard.approvalStatus = "correction";
  await scorecard.save();
  await writeAudit({
    actorId: user.id,
    action: "scorecard.correct",
    entityType: "Scorecard",
    entityId: scorecardId,
    reason,
  });
  revalidatePath(`/scorecards/${scorecardId}`);
}

export async function createCheckInAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "lockScorecard")) throw new Error("Not allowed");
  await connectDB();
  await CheckIn.create({
    managerId: user.id,
    memberId: String(formData.get("memberId")),
    date: formData.get("date") ? new Date(String(formData.get("date"))) : new Date(),
    progressNotes: String(formData.get("progressNotes") ?? ""),
    feedback: String(formData.get("feedback") ?? ""),
    constraints: String(formData.get("constraints") ?? ""),
    developmentActions: String(formData.get("developmentActions") ?? ""),
    followUpDate: formData.get("followUpDate") ? new Date(String(formData.get("followUpDate"))) : null,
  });
  revalidatePath("/check-ins");
}

export async function createCalibrationAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "calibrate")) throw new Error("Not allowed");
  await connectDB();
  await CalibrationRecord.create({
    periodStart: new Date(String(formData.get("periodStart"))),
    periodEnd: new Date(String(formData.get("periodEnd"))),
    population: String(formData.get("population") ?? ""),
    reviewerGroup: String(formData.get("reviewerGroup") ?? ""),
    ratingDistribution: JSON.parse(String(formData.get("ratingDistribution") ?? "{}")),
    decisions: String(formData.get("decisions") ?? ""),
    rationale: String(formData.get("rationale") ?? ""),
    createdBy: user.id,
  });
  await writeAudit({
    actorId: user.id,
    action: "calibration.create",
    entityType: "CalibrationRecord",
    entityId: "new",
  });
  revalidatePath("/calibration");
}

export async function saveAnnualReviewAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "lockScorecard")) throw new Error("Not allowed");
  await connectDB();
  const memberId = String(formData.get("memberId"));
  const year = Number(formData.get("year"));
  await AnnualReview.findOneAndUpdate(
    { memberId, year },
    {
      consolidatedScore: formData.get("consolidatedScore") ? Number(formData.get("consolidatedScore")) : null,
      managerComments: String(formData.get("managerComments") ?? ""),
      qualitativeEvidence: String(formData.get("qualitativeEvidence") ?? ""),
      developmentOutcomes: String(formData.get("developmentOutcomes") ?? ""),
      futureGoals: String(formData.get("futureGoals") ?? ""),
      approvalStatus: String(formData.get("approvalStatus") ?? "draft"),
      reviewerId: user.id,
    },
    { upsert: true, returnDocument: "after" },
  );
  revalidatePath("/annual-reviews");
}

export async function assertScorecardView(viewer: { id: string; role: string }, subjectId: string) {
  await connectDB();
  const subject = await User.findById(subjectId);
  if (
    !canViewIndividualScorecard({
      viewerId: viewer.id,
      viewerRole: viewer.role,
      subjectId,
      managerId: subject?.managerId ? String(subject.managerId) : null,
    })
  ) {
    throw new Error("Not authorized to view this performance record");
  }
}

export async function refreshKpisForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await refreshKpisAction(formData);
    return { message: "KPI results refreshed" };
  });
}

export async function generateScorecardForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await generateScorecardAction(formData);
    return { message: "Scorecard generated" };
  });
}

export async function generateTeamScorecardForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await generateTeamScorecardAction(formData);
    return { message: "Team scorecard generated" };
  });
}

export async function generateProjectScorecardForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await generateProjectScorecardAction(formData);
    return { message: "Project scorecard generated" };
  });
}

export async function approveScorecardForm(
  scorecardId: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await approveScorecardAction(scorecardId, formData);
    return { message: "Scorecard approved and locked" };
  });
}

export async function correctScorecardForm(
  scorecardId: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await correctScorecardAction(scorecardId, formData);
    return { message: "Scorecard unlocked for correction" };
  });
}

export async function createCheckInForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await createCheckInAction(formData);
    return { message: "Check-in saved" };
  });
}

export async function createCalibrationForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await createCalibrationAction(formData);
    return { message: "Calibration recorded" };
  });
}

export async function saveAnnualReviewForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await saveAnnualReviewAction(formData);
    return { message: "Annual review saved (not an auto-final rating)" };
  });
}
