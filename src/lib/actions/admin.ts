"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { requirePermission } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { User, Team } from "@/models/user";
import { ProjectTemplate } from "@/models/project";
import { KraCatalog, KpiCatalog, ScorecardTemplate } from "@/models/kpi";
import { RetentionPolicy, ScheduledReport } from "@/models/performance";
import { writeAudit } from "@/models/audit";
import { assertWeightsTotal100, isOperationalKpi } from "@/lib/engines/kpi";
import { ROLES, type Role } from "@/lib/constants";
import { oids, runAction, type ActionState } from "@/lib/safe-action";
import { publicOrigin } from "@/lib/app-url";

export async function createUserAction(formData: FormData) {
  const actor = await requirePermission("manageUsers");
  await connectDB();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "team_member") as Role;
  if (!ROLES.includes(role)) throw new Error("Invalid role");
  const inviteToken = crypto.randomBytes(24).toString("hex");
  const password = String(formData.get("password") ?? "");
  if (password) {
    const { validatePassword } = await import("@/lib/password");
    const invalid = validatePassword(password);
    if (invalid) throw new Error(invalid);
  }
  const user = await User.create({
    name,
    email,
    role,
    managerId: String(formData.get("managerId") || "") || null,
    teamId: String(formData.get("teamId") || "") || null,
    active: true,
    inviteToken: password ? null : inviteToken,
    inviteExpiresAt: password ? null : new Date(Date.now() + 7 * 86400000),
    passwordHash: password ? await bcrypt.hash(password, 10) : undefined,
  });
  await writeAudit({
    actorId: actor.id,
    action: "user.create",
    entityType: "User",
    entityId: String(user._id),
    after: { email, role },
  });
  revalidatePath("/admin/users");
  return { inviteToken: password ? null : inviteToken, id: String(user._id) };
}

export async function createUserFormAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const result = await createUserAction(formData);
    const origin = await publicOrigin();
    if (result.inviteToken) {
      return {
        inviteToken: result.inviteToken,
        message: `Invite created. Share ${origin}/invite/${result.inviteToken}`,
      };
    }
    return { message: "User created with a temporary password" };
  });
}

export async function updateUserAction(formData: FormData) {
  const actor = await requirePermission("manageUsers");
  await connectDB();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!ROLES.includes(role)) throw new Error("Invalid role");
  const before = await User.findById(id);
  if (!before) throw new Error("User not found");
  const active = formData.get("active") === "on";
  await User.findByIdAndUpdate(id, {
    name: String(formData.get("name") ?? before.name),
    role,
    managerId: String(formData.get("managerId") || "") || null,
    teamId: String(formData.get("teamId") || "") || null,
    active,
  });
  await writeAudit({
    actorId: actor.id,
    action: "user.update",
    entityType: "User",
    entityId: id,
    before: { role: before.role, active: before.active },
    after: { role, active },
  });
  revalidatePath("/admin/users");
}

export async function saveTemplateAction(formData: FormData) {
  const actor = await requirePermission("manageTemplates");
  await connectDB();
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    projectType: String(formData.get("projectType") ?? "Delivery"),
    reportingFrequency: String(formData.get("reportingFrequency") ?? "Weekly"),
    defaultMilestones: String(formData.get("milestones") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, days] = line.split("|");
        return { name: name.trim(), offsetDays: Number(days ?? 30) };
      }),
    active: formData.get("active") === "on",
  };
  if (id) {
    await ProjectTemplate.findByIdAndUpdate(id, payload);
  } else {
    await ProjectTemplate.create(payload);
  }
  await writeAudit({
    actorId: actor.id,
    action: "template.save",
    entityType: "ProjectTemplate",
    entityId: id || "new",
    after: payload,
  });
  revalidatePath("/admin/templates");
}

export async function saveKpiAction(formData: FormData) {
  const actor = await requirePermission("manageCatalog");
  await connectDB();
  const kraId = String(formData.get("kraId"));
  const ownerType = String(formData.get("ownerType") ?? "member");
  const siblings = await KpiCatalog.find({ kraId, ownerType, approvalStatus: "approved" });
  const weight = Number(formData.get("weight"));
  const id = String(formData.get("id") ?? "");
  const weights = siblings.filter((s) => String(s._id) !== id).map((s) => s.weight);
  weights.push(weight);
  assertWeightsTotal100(weights, "KPI", formData.get("weightException") === "on");
  const key = String(formData.get("key") ?? "");
  const approvalStatus = String(formData.get("approvalStatus") ?? "approved");
  if (isOperationalKpi(key) && approvalStatus === "approved") {
    throw new Error("Ticket count and story points are operational indicators only and cannot be used on formal scorecards (BRULE-11)");
  }
  const payload = {
    key,
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    kraId,
    ownerType,
    formula: String(formData.get("formula") ?? key),
    target: Number(formData.get("target")),
    thresholdBands: {
      green: Number(formData.get("green")),
      amber: Number(formData.get("amber")),
    },
    weight,
    measurementPeriod: String(formData.get("measurementPeriod") ?? "quarterly"),
    dataSource: String(formData.get("dataSource") ?? "calculated"),
    direction: String(formData.get("direction") ?? "higher-is-better"),
    approvalStatus,
    minSampleSize: Number(formData.get("minSampleSize") ?? 3),
    qualityGuardrail: formData.get("guardrailMetric")
      ? {
          metric: String(formData.get("guardrailMetric")),
          min: formData.get("guardrailMin") ? Number(formData.get("guardrailMin")) : undefined,
          max: formData.get("guardrailMax") ? Number(formData.get("guardrailMax")) : undefined,
        }
      : undefined,
  };
  if (id) await KpiCatalog.findByIdAndUpdate(id, payload);
  else await KpiCatalog.create(payload);
  await writeAudit({
    actorId: actor.id,
    action: "kpi.catalog.save",
    entityType: "KpiCatalog",
    entityId: id || "new",
    after: payload,
  });
  revalidatePath("/admin/catalog");
}

export async function saveKraAction(formData: FormData) {
  const actor = await requirePermission("manageCatalog");
  await connectDB();
  const role = String(formData.get("applicableRole"));
  const id = String(formData.get("id") ?? "");
  const weight = Number(formData.get("weight"));
  const siblings = await KraCatalog.find({ applicableRole: role, approvalStatus: "approved" });
  const weights = siblings.filter((s) => String(s._id) !== id).map((s) => s.weight);
  weights.push(weight);
  assertWeightsTotal100(weights, "KRA", formData.get("weightException") === "on");
  const payload = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    applicableRole: role,
    weight,
    ownerRole: String(formData.get("ownerRole") ?? "pmo_admin"),
    period: String(formData.get("period") ?? "quarterly"),
    approvalStatus: String(formData.get("approvalStatus") ?? "approved"),
  };
  const kra = id ? await KraCatalog.findByIdAndUpdate(id, payload, { returnDocument: "after" }) : await KraCatalog.create(payload);
  const template = await ScorecardTemplate.findOne({ role });
  if (template && kra && !template.kraIds.some((k: { toString: () => string }) => String(k) === String(kra._id))) {
    template.kraIds.push(kra._id);
    await template.save();
  }
  await writeAudit({
    actorId: actor.id,
    action: "kra.catalog.save",
    entityType: "KraCatalog",
    entityId: String(kra?._id),
  });
  revalidatePath("/admin/catalog");
}

export async function saveRetentionAction(formData: FormData) {
  const actor = await requirePermission("manageRetention");
  await connectDB();
  const entityType = String(formData.get("entityType"));
  await RetentionPolicy.findOneAndUpdate(
    { entityType },
    {
      retainDays: Number(formData.get("retainDays") ?? 2555),
      action: String(formData.get("action") ?? "archive"),
      updatedBy: actor.id,
    },
    { upsert: true, returnDocument: "after" },
  );
  revalidatePath("/admin/retention");
}

export async function scheduleReportAction(formData: FormData) {
  const user = await requirePermission("scheduleReports");
  await connectDB();
  await ScheduledReport.create({
    name: String(formData.get("name") ?? "Weekly portfolio"),
    reportType: String(formData.get("reportType") ?? "portfolio"),
    recipientIds: oids(formData, "recipientIds"),
    cadence: String(formData.get("cadence") ?? "weekly"),
    active: true,
    createdBy: user.id,
  });
  revalidatePath("/reports");
}

export async function createTeamAction(formData: FormData) {
  await requirePermission("manageUsers");
  await connectDB();
  await Team.create({
    name: String(formData.get("name") ?? ""),
    functionalArea: String(formData.get("functionalArea") ?? ""),
    managerId: String(formData.get("managerId") || "") || null,
    memberIds: oids(formData, "memberIds"),
    active: true,
  });
  revalidatePath("/admin/users");
}

export async function saveKraForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await saveKraAction(formData);
    return { message: "KRA saved" };
  });
}

export async function saveKpiForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await saveKpiAction(formData);
    return { message: "KPI saved" };
  });
}

export async function saveRetentionForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await saveRetentionAction(formData);
    return { message: "Retention policy saved" };
  });
}

export async function scheduleReportForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await scheduleReportAction(formData);
    return { message: "Report scheduled" };
  });
}
