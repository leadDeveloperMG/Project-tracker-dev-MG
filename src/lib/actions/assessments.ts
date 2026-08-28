"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { Assessment } from "@/models/assessment";
import { writeAudit } from "@/models/audit";
import { assertProjectAccess } from "@/lib/access";
import { buildDefaultAssessmentDimensions, weightedAssessmentScore } from "@/lib/engines/assessment";
import { notify } from "@/lib/services/notify";
import { refreshProjectHealth } from "@/lib/services/health-service";
import { refreshKpiResults } from "@/lib/services/kpi-service";
import { currentQuarterBounds } from "@/lib/dates";
import { runAction, type ActionState } from "@/lib/safe-action";

export async function submitAssessmentAction(deliverableId: string, formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "assessDeliverable")) throw new Error("Not allowed");
  await connectDB();
  const item = await WorkItem.findById(deliverableId);
  if (!item || item.type !== "Deliverable") throw new Error("Deliverable not found");
  await assertProjectAccess(user, String(item.projectId));

  const dimensions = buildDefaultAssessmentDimensions(formData);
  const overallScore = weightedAssessmentScore(dimensions);
  const outcome = String(formData.get("outcome") ?? "record");
  const reworkActions = String(formData.get("reworkActions") ?? "").trim();
  const comments = String(formData.get("comments") ?? "").trim();
  const revisedDue = formData.get("revisedDueDate") ? new Date(String(formData.get("revisedDueDate"))) : null;

  const designated =
    (item.approverId && String(item.approverId) === user.id) || hasPermission(user.role, "acceptDeliverable");
  if (["accept", "reject", "rework"].includes(outcome) && !designated) {
    throw new Error("Only designated approvers can accept, reject, or send rework (FR-025)");
  }
  if (outcome === "accept" && item.assigneeId && String(item.assigneeId) === user.id && !item.selfAcceptException) {
    throw new Error("A deliverable owner cannot accept their own deliverable (BRULE-03)");
  }
  if (outcome === "rework") {
    if (!comments || !reworkActions) {
      throw new Error("Rework requires reviewer comments and corrective-action expectations (BRULE-04)");
    }
  }

  const previous = await Assessment.findOne({ deliverableId }).sort({ createdAt: -1 });
  const assessment = await Assessment.create({
    deliverableId,
    projectId: item.projectId,
    dimensions,
    overallScore,
    reviewerId: user.id,
    reviewDate: new Date(),
    comments,
    evidenceUrl: String(formData.get("evidenceUrl") ?? "") || undefined,
    reworkActions: reworkActions || undefined,
    revisedDueDate: revisedDue,
    previousId: previous?._id ?? null,
  });

  item.reviewed = true;
  if (outcome === "rework") {
    item.reworkCount += 1;
    item.status = "Rework Required";
    if (revisedDue) item.dueDate = revisedDue;
  }
  if (outcome === "accept") {
    item.status = "Accepted";
    if (item.reworkCount === 0) item.firstPassAccepted = true;
    if (!item.actualDate) item.actualDate = new Date();
  }
  if (outcome === "reject") {
    item.status = "Rejected";
    if (!item.actualDate) item.actualDate = new Date();
  }
  await item.save();
  if (["rework", "reject", "accept"].includes(outcome) && item.assigneeId) {
    const title =
      outcome === "accept"
        ? `${item.key} accepted`
        : `${item.key} ${outcome === "reject" ? "rejected" : "returned for rework"}`;
    await notify({
      userId: String(item.assigneeId),
      type: outcome === "accept" ? "accepted" : "rework",
      title,
      body: comments || item.title,
      href: `/projects/${item.projectId}/work/${item._id}`,
      email: true,
    });
  }
  const projectId = String(item.projectId);
  await refreshProjectHealth(projectId);
  const { start, end } = currentQuarterBounds();
  await refreshKpiResults(start, end);
  await writeAudit({
    actorId: user.id,
    action: outcome === "rework" ? "assessment.rework" : "assessment.create",
    entityType: "Assessment",
    entityId: String(assessment._id),
    after: { overallScore, deliverableId, outcome },
  });
  revalidatePath(`/reviews`);
  revalidatePath(`/reviews/${deliverableId}`);
  revalidatePath(`/projects/${projectId}/work/${deliverableId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/health`);
  revalidatePath("/dashboard");
  revalidatePath("/portfolio");
  revalidatePath("/scorecards");
}

export async function submitAssessmentForm(
  deliverableId: string,
  _state: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await submitAssessmentAction(deliverableId, formData);
    return { message: "Assessment saved" };
  });
}
