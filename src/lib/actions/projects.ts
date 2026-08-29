"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { requireUser } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { connectDB } from "@/lib/db";
import { Project, ProjectTemplate } from "@/models/project";
import { WorkItem } from "@/models/work-item";
import { StatusReport } from "@/models/assessment";
import { writeAudit } from "@/models/audit";
import { canMoveProjectToInProgress, initialStatus } from "@/lib/engines/workflow";
import { applyOverride } from "@/lib/engines/health";
import { refreshProjectHealth } from "@/lib/services/health-service";
import { refreshFlags } from "@/lib/services/flags-service";
import { assertCanManageProject, assertProjectAccess } from "@/lib/access";
import type { HealthDimension, Rag } from "@/lib/constants";
import { HEALTH_DIMENSIONS } from "@/lib/constants";
import { oids, runAction, type ActionState } from "@/lib/safe-action";
import { AppError } from "@/lib/errors";

function oid(value: FormDataEntryValue | null) {
  const s = String(value ?? "");
  return s && mongoose.Types.ObjectId.isValid(s) ? s : null;
}

export async function createProjectAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "createProject")) {
    throw new AppError("You do not have permission to create projects.", { status: 403 });
  }
  await connectDB();
  const templateId = oid(formData.get("templateId"));
  const template = templateId ? await ProjectTemplate.findById(templateId) : null;
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Enter a project name.";
  if (!code) fieldErrors.code = "Enter a short unique code, such as CPR.";
  if (!formData.get("businessUnit")) fieldErrors.businessUnit = "Enter a business unit.";
  if (!formData.get("sponsorId")) fieldErrors.sponsorId = "Select a sponsor.";
  if (!formData.get("startDate") || !formData.get("targetEndDate")) {
    fieldErrors.startDate = "Set start and target end dates.";
  }
  if (Object.keys(fieldErrors).length) {
    throw new AppError("Fix the highlighted fields to create this project.", { fieldErrors });
  }
  const startDate = formData.get("startDate") ? new Date(String(formData.get("startDate"))) : null;
  const targetEndDate = formData.get("targetEndDate") ? new Date(String(formData.get("targetEndDate"))) : null;
  const project = await Project.create({
    name,
    code,
    templateId: templateId || undefined,
    sponsorId: oid(formData.get("sponsorId")),
    managerId: oid(formData.get("managerId")) ?? user.id,
    teamLeadId: oid(formData.get("teamLeadId")),
    businessUnit: String(formData.get("businessUnit") ?? ""),
    strategicObjective: String(formData.get("strategicObjective") ?? ""),
    startDate,
    targetEndDate,
    projectType: String(formData.get("projectType") ?? template?.projectType ?? "Delivery"),
    reportingFrequency: String(formData.get("reportingFrequency") ?? template?.reportingFrequency ?? "Weekly"),
    status: "Proposed",
    charter: String(formData.get("charter") ?? ""),
    scopeBaseline: String(formData.get("scopeBaseline") ?? ""),
    teamMemberIds: oids(formData, "teamMemberIds"),
    stakeholderIds: oids(formData, "stakeholderIds"),
    reviewerIds: oids(formData, "reviewerIds"),
    approverIds: oids(formData, "approverIds"),
  });
  if (template?.defaultMilestones?.length && startDate) {
    let counter = 0;
    for (const ms of template.defaultMilestones) {
      counter += 1;
      const due = new Date(startDate);
      due.setDate(due.getDate() + (ms.offsetDays || 0));
      await WorkItem.create({
        key: `${code}-${counter}`,
        projectId: project._id,
        type: "Milestone",
        title: ms.name,
        status: initialStatus("Milestone"),
        dueDate: due,
        baselineDate: due,
        plannedDate: due,
        assigneeId: project.managerId,
      });
    }
    project.counter = counter;
    await project.save();
  }
  await writeAudit({
    actorId: user.id,
    action: "project.create",
    entityType: "Project",
    entityId: String(project._id),
    after: { name, code },
  });
  revalidatePath("/projects");
  redirect(`/projects/${project._id}`);
}

export async function createProjectFormAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await createProjectAction(formData);
  });
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const user = await requireUser();
  await connectDB();
  const project = await assertProjectAccess(user, projectId);
  assertCanManageProject(user, project);
  const nextStatus = String(formData.get("status") ?? project.status);
  if (nextStatus === "In Progress" && project.status !== "In Progress") {
    const milestones = await WorkItem.countDocuments({ projectId, type: "Milestone", deletedAt: null });
    const gate = canMoveProjectToInProgress({
      managerId: String(formData.get("managerId") || project.managerId || ""),
      sponsorId: String(formData.get("sponsorId") || project.sponsorId || ""),
      startDate: formData.get("startDate") ? new Date(String(formData.get("startDate"))) : project.startDate,
      targetEndDate: formData.get("targetEndDate")
        ? new Date(String(formData.get("targetEndDate")))
        : project.targetEndDate,
      hasMilestonePlan: milestones > 0,
    });
    if (!gate.ok) throw new Error(gate.error);
  }
  const before = { status: project.status, name: project.name };
  project.name = String(formData.get("name") ?? project.name);
  project.sponsorId = oid(formData.get("sponsorId")) as never;
  project.managerId = oid(formData.get("managerId")) as never;
  project.teamLeadId = oid(formData.get("teamLeadId")) as never;
  project.businessUnit = String(formData.get("businessUnit") ?? project.businessUnit);
  project.strategicObjective = String(formData.get("strategicObjective") ?? project.strategicObjective);
  project.startDate = formData.get("startDate") ? new Date(String(formData.get("startDate"))) : project.startDate;
  project.targetEndDate = formData.get("targetEndDate")
    ? new Date(String(formData.get("targetEndDate")))
    : project.targetEndDate;
  project.status = nextStatus as typeof project.status;
  project.charter = String(formData.get("charter") ?? project.charter);
  project.scopeBaseline = String(formData.get("scopeBaseline") ?? project.scopeBaseline);
  project.periodGoals = String(formData.get("periodGoals") ?? project.periodGoals ?? "");
  if (formData.get("confirmGoals") === "on") {
    project.goalsConfirmedAt = new Date();
  }
  project.teamMemberIds = oids(formData, "teamMemberIds") as never;
  project.stakeholderIds = oids(formData, "stakeholderIds") as never;
  project.reviewerIds = oids(formData, "reviewerIds") as never;
  project.approverIds = oids(formData, "approverIds") as never;
  await project.save();
  await writeAudit({
    actorId: user.id,
    action: "project.update",
    entityType: "Project",
    entityId: projectId,
    before,
    after: { status: project.status, name: project.name },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function overrideHealthAction(projectId: string, formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "overrideHealth")) throw new Error("Not allowed");
  await connectDB();
  const project = await assertProjectAccess(user, projectId);
  const dim = String(formData.get("dimension")) as HealthDimension;
  if (!HEALTH_DIMENSIONS.includes(dim)) throw new Error("Invalid dimension");
  const rag = String(formData.get("rag")) as Rag;
  const rationale = String(formData.get("rationale") ?? "");
  const result = applyOverride(project.health[dim] as never, rag, rationale);
  if (!result.ok) throw new Error(result.error);
  project.health[dim] = result.cell;
  await project.save();
  await writeAudit({
    actorId: user.id,
    action: "health.override",
    entityType: "Project",
    entityId: projectId,
    after: { dim, rag },
    reason: rationale,
  });
  revalidatePath(`/projects/${projectId}/health`);
}

export async function recalcHealthAction(projectId: string) {
  const user = await requireUser();
  await assertProjectAccess(user, projectId);
  await refreshFlags(projectId);
  await refreshProjectHealth(projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function saveStatusReportAction(projectId: string, formData: FormData) {
  const user = await requireUser();
  await connectDB();
  await assertProjectAccess(user, projectId);
  const periodEnd = new Date(String(formData.get("periodEnd")));
  const periodStart = new Date(String(formData.get("periodStart")));
  const now = new Date();
  await StatusReport.create({
    projectId,
    periodStart,
    periodEnd,
    accomplishments: String(formData.get("accomplishments") ?? ""),
    nextPeriodPlans: String(formData.get("nextPeriodPlans") ?? ""),
    blockers: String(formData.get("blockers") ?? ""),
    decisionsNeeded: String(formData.get("decisionsNeeded") ?? ""),
    risks: String(formData.get("risks") ?? ""),
    overallHealth: String(formData.get("overallHealth") ?? "amber"),
    submittedAt: now,
    submittedBy: user.id,
    onTime: now.getTime() <= periodEnd.getTime() + 86400000,
  });
  await writeAudit({
    actorId: user.id,
    action: "statusReport.create",
    entityType: "StatusReport",
    entityId: projectId,
  });
  revalidatePath(`/projects/${projectId}/reports`);
}

export async function updateProjectFormAction(
  projectId: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await updateProjectAction(projectId, formData);
    return { message: "Project saved" };
  });
}

export async function overrideHealthFormAction(
  projectId: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await overrideHealthAction(projectId, formData);
    return { message: "Override saved" };
  });
}

export async function saveStatusReportFormAction(
  projectId: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await saveStatusReportAction(projectId, formData);
    return { message: "Status report submitted" };
  });
}
