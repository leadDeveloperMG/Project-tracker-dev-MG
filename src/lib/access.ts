import { connectDB } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { Project } from "@/models/project";
import mongoose from "mongoose";

export async function accessibleProjects(user: { id: string; role: string }) {
  await connectDB();
  const filter: Record<string, unknown> = { deletedAt: null };
  if (!hasPermission(user.role, "viewAllProjects")) {
    const oid = new mongoose.Types.ObjectId(user.id);
    filter.$or = [
      { managerId: oid },
      { teamLeadId: oid },
      { sponsorId: oid },
      { teamMemberIds: oid },
      { stakeholderIds: oid },
      { reviewerIds: oid },
      { approverIds: oid },
    ];
  }
  return Project.find(filter).sort({ updatedAt: -1 });
}

export async function assertProjectAccess(user: { id: string; role: string }, projectId: string) {
  const projects = await accessibleProjects(user);
  const match = projects.find((p) => String(p._id) === projectId);
  if (!match) throw new Error("Project not found or access denied");
  return match;
}

export function canManageProject(
  user: { id: string; role: string },
  project: { managerId?: unknown; teamLeadId?: unknown },
) {
  if (user.role === "system_admin" || user.role === "pmo_admin") return true;
  if (user.role === "project_manager" && String(project.managerId ?? "") === user.id) return true;
  if (user.role === "team_lead" && String(project.teamLeadId ?? "") === user.id) return true;
  return false;
}

export function assertCanManageProject(
  user: { id: string; role: string },
  project: { managerId?: unknown; teamLeadId?: unknown },
) {
  if (!canManageProject(user, project)) {
    throw new Error("Only the project manager, team lead, or PMO can change project controls");
  }
}
