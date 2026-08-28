"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/project";
import { WorkItem } from "@/models/work-item";
import { writeAudit } from "@/models/audit";
import { allowedTransitions, canTransition, initialStatus } from "@/lib/engines/workflow";
import { calculateProgress, computeFlags } from "@/lib/engines/progress";
import { assertProjectAccess } from "@/lib/access";
import { notify } from "@/lib/services/notify";
import { refreshProjectHealth } from "@/lib/services/health-service";
import type { LinkType, WorkType } from "@/lib/constants";
import { WORK_TYPES } from "@/lib/constants";
import { runAction, type ActionState } from "@/lib/safe-action";

function oid(value: FormDataEntryValue | null) {
  const s = String(value ?? "");
  return s && mongoose.Types.ObjectId.isValid(s) ? s : null;
}

async function nextKey(projectId: string) {
  const project = await Project.findByIdAndUpdate(projectId, { $inc: { counter: 1 } }, { returnDocument: "after" });
  if (!project) throw new Error("Project not found");
  return `${project.code}-${project.counter}`;
}

async function rollupParent(parentId?: mongoose.Types.ObjectId | string | null) {
  if (!parentId) return;
  const parent = await WorkItem.findById(parentId);
  if (!parent || parent.progressMode === "manual") return;
  const children = await WorkItem.find({ parentId: parent._id, deletedAt: null });
  parent.progress = calculateProgress(
    parent.progressMode,
    children.map((c) => ({ progress: c.progress, weight: c.progressWeight, status: c.status })),
  );
  await parent.save();
}

export async function createWorkItemAction(projectId: string, formData: FormData) {
  const user = await requireUser();
  await connectDB();
  await assertProjectAccess(user, projectId);
  const type = String(formData.get("type")) as WorkType;
  if (!WORK_TYPES.includes(type)) throw new Error("Invalid work type");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");
  const item = await WorkItem.create({
    key: await nextKey(projectId),
    projectId,
    type,
    title,
    description: String(formData.get("description") ?? ""),
    parentId: oid(formData.get("parentId")),
    assigneeId: oid(formData.get("assigneeId")),
    approverId: oid(formData.get("approverId")),
    status: initialStatus(type),
    priority: String(formData.get("priority") ?? "Medium"),
    dueDate: formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : null,
    plannedDate: formData.get("plannedDate") ? new Date(String(formData.get("plannedDate"))) : null,
    baselineDate: formData.get("baselineDate") ? new Date(String(formData.get("baselineDate"))) : null,
    forecastDate: formData.get("forecastDate") ? new Date(String(formData.get("forecastDate"))) : null,
    plannedEffort: formData.get("plannedEffort") ? Number(formData.get("plannedEffort")) : null,
    acceptanceCriteria: String(formData.get("acceptanceCriteria") ?? ""),
    committed: formData.get("committed") === "on",
    likelihood: formData.get("likelihood") ? Number(formData.get("likelihood")) : undefined,
    impact: formData.get("impact") ? Number(formData.get("impact")) : undefined,
    mitigation: String(formData.get("mitigation") ?? ""),
  });
  if (item.likelihood && item.impact) item.exposure = item.likelihood * item.impact;
  item.flags = computeFlags({
    type: item.type,
    status: item.status,
    assigneeId: item.assigneeId ? String(item.assigneeId) : null,
    dueDate: item.dueDate,
    updatedAt: item.updatedAt,
    acceptanceCriteria: item.acceptanceCriteria,
    title: item.title,
  });
  await item.save();
  await rollupParent(item.parentId);
  await writeAudit({
    actorId: user.id,
    action: "work.create",
    entityType: "WorkItem",
    entityId: String(item._id),
    after: { key: item.key, type, title },
  });
  revalidatePath(`/projects/${projectId}/work`);
  redirect(`/projects/${projectId}/work/${item._id}`);
}

export async function updateWorkItemAction(itemId: string, formData: FormData) {
  const user = await requireUser();
  await connectDB();
  const item = await WorkItem.findById(itemId);
  if (!item) throw new Error("Work item not found");
  await assertProjectAccess(user, String(item.projectId));
  item.title = String(formData.get("title") ?? item.title);
  item.description = String(formData.get("description") ?? item.description);
  item.assigneeId = oid(formData.get("assigneeId")) as never;
  item.approverId = oid(formData.get("approverId")) as never;
  item.priority = String(formData.get("priority") ?? item.priority) as typeof item.priority;
  item.dueDate = formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : item.dueDate;
  item.plannedDate = formData.get("plannedDate") ? new Date(String(formData.get("plannedDate"))) : item.plannedDate;
  item.baselineDate = formData.get("baselineDate") ? new Date(String(formData.get("baselineDate"))) : item.baselineDate;
  item.forecastDate = formData.get("forecastDate") ? new Date(String(formData.get("forecastDate"))) : item.forecastDate;
  item.actualDate = formData.get("actualDate") ? new Date(String(formData.get("actualDate"))) : item.actualDate;
  item.acceptanceCriteria = String(formData.get("acceptanceCriteria") ?? item.acceptanceCriteria);
  item.plannedEffort = formData.get("plannedEffort") ? Number(formData.get("plannedEffort")) : item.plannedEffort;
  item.actualEffort = formData.get("actualEffort") ? Number(formData.get("actualEffort")) : item.actualEffort;
  item.progressMode = (String(formData.get("progressMode") ?? item.progressMode) as typeof item.progressMode);
  if (item.progressMode === "manual") item.progress = Number(formData.get("progress") ?? item.progress);
  item.committed = formData.get("committed") === "on";
  item.likelihood = formData.get("likelihood") ? Number(formData.get("likelihood")) : item.likelihood;
  item.impact = formData.get("impact") ? Number(formData.get("impact")) : item.impact;
  if (item.likelihood && item.impact) item.exposure = item.likelihood * item.impact;
  item.mitigation = String(formData.get("mitigation") ?? item.mitigation ?? "");
  const children = await WorkItem.find({ parentId: item._id, deletedAt: null });
  if (children.length && item.progressMode !== "manual") {
    item.progress = calculateProgress(
      item.progressMode,
      children.map((c) => ({ progress: c.progress, weight: c.progressWeight, status: c.status })),
    );
  }
  item.flags = computeFlags({
    type: item.type,
    status: item.status,
    assigneeId: item.assigneeId ? String(item.assigneeId) : null,
    dueDate: item.dueDate,
    updatedAt: new Date(),
    blocked: item.blocked,
    acceptanceCriteria: item.acceptanceCriteria,
    title: item.title,
  });
  await item.save();
  await rollupParent(item.parentId);
  await writeAudit({
    actorId: user.id,
    action: "work.update",
    entityType: "WorkItem",
    entityId: itemId,
    after: { title: item.title },
  });
  revalidatePath(`/projects/${item.projectId}/work/${itemId}`);
}

export async function transitionWorkItemAction(itemId: string, formData: FormData) {
  const user = await requireUser();
  await connectDB();
  const item = await WorkItem.findById(itemId);
  if (!item) throw new Error("Work item not found");
  await assertProjectAccess(user, String(item.projectId));
  const toStatus = String(formData.get("toStatus") ?? "");
  const comments = String(formData.get("comments") ?? "");
  const correctiveAction = String(formData.get("correctiveAction") ?? "");
  const result = canTransition(
    {
      type: item.type,
      status: item.status,
      actorId: user.id,
      ownerId: item.assigneeId ? String(item.assigneeId) : null,
      approverId: item.approverId ? String(item.approverId) : null,
      actorRole: user.role,
      hasOwner: Boolean(item.assigneeId),
      hasDueDate: Boolean(item.dueDate),
      hasAcceptanceCriteria: Boolean(item.acceptanceCriteria?.trim()),
      hasEvidence: item.attachments.length > 0 || item.comments.length > 0,
      comments,
      correctiveAction,
      selfAcceptException: item.selfAcceptException,
    },
    toStatus,
  );
  if (!result.ok) throw new Error(result.error);
  const from = item.status;
  item.status = toStatus;
  if (toStatus === "Blocked") {
    item.blocked = true;
    item.blockerOpenedAt = item.blockerOpenedAt ?? new Date();
  }
  if (from === "Blocked" && toStatus !== "Blocked") {
    item.blocked = false;
    item.blockerResolvedAt = new Date();
  }
  if (["Accepted", "Done", "Closed", "Implemented"].includes(toStatus) && !item.actualDate) {
    item.actualDate = new Date();
  }
  if (toStatus === "Accepted" && item.reworkCount === 0) item.firstPassAccepted = true;
  if (toStatus === "Rework Required") {
    item.reworkCount += 1;
    item.reviewed = true;
    if (formData.get("revisedDueDate")) item.dueDate = new Date(String(formData.get("revisedDueDate")));
  }
  if (["Accepted", "Rejected"].includes(toStatus)) item.reviewed = true;
  if (comments) {
    item.comments.push({ authorId: new mongoose.Types.ObjectId(user.id), body: comments, createdAt: new Date() });
  }
  await item.save();
  await rollupParent(item.parentId);
  await writeAudit({
    actorId: user.id,
    action: "work.transition",
    entityType: "WorkItem",
    entityId: itemId,
    before: { status: from },
    after: { status: toStatus },
    reason: comments || correctiveAction,
  });
  const project = await Project.findById(item.projectId);
  if (toStatus === "Ready for Review" && item.approverId) {
    await notify({
      userId: String(item.approverId),
      type: "review",
      title: `${item.key} is ready for review`,
      body: item.title,
      href: `/projects/${item.projectId}/work/${item._id}`,
      email: true,
    });
  }
  if (["Rework Required", "Rejected"].includes(toStatus) && project?.managerId) {
    await notify({
      userId: String(project.managerId),
      type: "rework",
      title: `${item.key} ${toStatus}`,
      body: comments || item.title,
      href: `/projects/${item.projectId}/work/${item._id}`,
      email: true,
    });
  }
  await refreshProjectHealth(String(item.projectId));
  revalidatePath(`/projects/${item.projectId}/work/${itemId}`);
}

export async function addCommentAction(itemId: string, formData: FormData) {
  const user = await requireUser();
  await connectDB();
  const item = await WorkItem.findById(itemId);
  if (!item) throw new Error("Work item not found");
  await assertProjectAccess(user, String(item.projectId));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Comment is required");
  item.comments.push({ authorId: new mongoose.Types.ObjectId(user.id), body, createdAt: new Date() });
  await item.save();
  revalidatePath(`/projects/${item.projectId}/work/${itemId}`);
}

export async function addLinkAction(itemId: string, formData: FormData) {
  const user = await requireUser();
  await connectDB();
  const item = await WorkItem.findById(itemId);
  if (!item) throw new Error("Work item not found");
  await assertProjectAccess(user, String(item.projectId));
  const targetId = oid(formData.get("targetId"));
  const type = String(formData.get("linkType") ?? "relates to") as LinkType;
  if (!targetId) throw new Error("Target is required");
  item.links.push({ type, targetId: new mongoose.Types.ObjectId(targetId) });
  await item.save();
  revalidatePath(`/projects/${item.projectId}/work/${itemId}`);
}

export async function attachEvidenceAction(itemId: string, formData: FormData) {
  const user = await requireUser();
  await connectDB();
  const item = await WorkItem.findById(itemId);
  if (!item) throw new Error("Work item not found");
  await assertProjectAccess(user, String(item.projectId));
  const named = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!named || !url) throw new Error("Name and URL are required");
  item.attachments.push({
    name: named,
    url,
    uploadedBy: new mongoose.Types.ObjectId(user.id),
    uploadedAt: new Date(),
  });
  await item.save();
  await writeAudit({
    actorId: user.id,
    action: "work.attach",
    entityType: "WorkItem",
    entityId: itemId,
    after: { name: named, url },
  });
  revalidatePath(`/projects/${item.projectId}/work/${itemId}`);
}

export async function archiveWorkItemAction(itemId: string) {
  const user = await requireUser();
  await connectDB();
  const item = await WorkItem.findById(itemId);
  if (!item) throw new Error("Work item not found");
  await assertProjectAccess(user, String(item.projectId));
  item.deletedAt = new Date();
  await item.save();
  await rollupParent(item.parentId);
  await writeAudit({
    actorId: user.id,
    action: "work.archive",
    entityType: "WorkItem",
    entityId: itemId,
  });
  revalidatePath(`/projects/${item.projectId}/work`);
  redirect(`/projects/${item.projectId}/work`);
}

export async function uploadEvidenceFileAction(
  itemId: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser();
    await connectDB();
    const item = await WorkItem.findById(itemId);
    if (!item) throw new Error("Work item not found");
    await assertProjectAccess(user, String(item.projectId));
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload");
    if (file.size > 4_000_000) throw new Error("File must be 4MB or smaller");
    let url = "";
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`evidence/${itemId}/${file.name}`, file, {
        access: "public",
        addRandomSuffix: true,
      });
      url = blob.url;
    } else {
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.length > 700_000) {
        throw new Error("File too large for local fallback. Configure Vercel Blob.");
      }
      url = `data:${file.type || "application/octet-stream"};base64,${buf.toString("base64")}`;
    }
    item.attachments.push({
      name: file.name,
      url,
      uploadedBy: new mongoose.Types.ObjectId(user.id),
      uploadedAt: new Date(),
    });
    await item.save();
    await writeAudit({
      actorId: user.id,
      action: "work.attach",
      entityType: "WorkItem",
      entityId: itemId,
      after: { name: file.name, url: url.startsWith("data:") ? "data-url" : url },
    });
    revalidatePath(`/projects/${item.projectId}/work/${itemId}`);
    return { message: `${file.name} attached` };
  });
}

export async function transitionWorkItemFormAction(
  itemId: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await transitionWorkItemAction(itemId, formData);
    return { message: "Status updated" };
  });
}

export async function updateWorkItemFormAction(
  itemId: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await updateWorkItemAction(itemId, formData);
    return { message: "Work item saved" };
  });
}

export async function createWorkItemFormAction(
  projectId: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(() => createWorkItemAction(projectId, formData));
}


