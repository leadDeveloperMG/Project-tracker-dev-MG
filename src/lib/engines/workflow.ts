import {
  CHANGE_STATUSES,
  DELIVERABLE_STATUSES,
  GENERIC_STATUSES,
  RISK_STATUSES,
  TASK_STATUSES,
  type WorkType,
} from "@/lib/constants";

export type WorkflowContext = {
  type: WorkType;
  status: string;
  actorId: string;
  ownerId?: string | null;
  approverId?: string | null;
  actorRole?: string;
  hasOwner?: boolean;
  hasDueDate?: boolean;
  hasAcceptanceCriteria?: boolean;
  hasEvidence?: boolean;
  comments?: string;
  correctiveAction?: string;
  selfAcceptException?: boolean;
};

const TASK_TRANSITIONS: Record<string, string[]> = {
  "To Do": ["In Progress", "Cancelled"],
  "In Progress": ["Blocked", "In Review", "Done", "Cancelled"],
  Blocked: ["In Progress", "Cancelled"],
  "In Review": ["In Progress", "Done", "Cancelled"],
  Done: [],
  Cancelled: [],
};

const DELIVERABLE_TRANSITIONS: Record<string, string[]> = {
  Draft: ["In Progress", "Cancelled"],
  "In Progress": ["Ready for Review", "Cancelled"],
  "Ready for Review": ["Rework Required", "Accepted", "Rejected"],
  "Rework Required": ["In Progress", "Ready for Review"],
  Accepted: ["Closed"],
  Rejected: ["Closed", "Rework Required"],
  Closed: [],
};

const RISK_TRANSITIONS: Record<string, string[]> = {
  Identified: ["Analyzing"],
  Analyzing: ["Mitigating", "Accepted", "Closed"],
  Mitigating: ["Monitoring", "Closed"],
  Monitoring: ["Mitigating", "Closed", "Accepted"],
  Closed: [],
  Accepted: ["Closed"],
};

const CHANGE_TRANSITIONS: Record<string, string[]> = {
  Submitted: ["Under Review"],
  "Under Review": ["Approved", "Rejected"],
  Approved: ["Implementing", "Closed"],
  Rejected: ["Closed"],
  Implementing: ["Implemented", "Closed"],
  Implemented: ["Closed"],
  Closed: [],
};

const GENERIC_TRANSITIONS: Record<string, string[]> = {
  "To Do": ["In Progress", "Cancelled"],
  "In Progress": ["Done", "Cancelled"],
  Done: [],
  Cancelled: [],
};

export function statusesForType(type: WorkType): readonly string[] {
  switch (type) {
    case "Task":
    case "Sub-task":
    case "Issue":
      return TASK_STATUSES;
    case "Deliverable":
      return DELIVERABLE_STATUSES;
    case "Risk":
      return RISK_STATUSES;
    case "Change Request":
      return CHANGE_STATUSES;
    default:
      return GENERIC_STATUSES;
  }
}

export function initialStatus(type: WorkType): string {
  return statusesForType(type)[0];
}

function transitionMap(type: WorkType): Record<string, string[]> {
  switch (type) {
    case "Task":
    case "Sub-task":
    case "Issue":
      return TASK_TRANSITIONS;
    case "Deliverable":
      return DELIVERABLE_TRANSITIONS;
    case "Risk":
      return RISK_TRANSITIONS;
    case "Change Request":
      return CHANGE_TRANSITIONS;
    default:
      return GENERIC_TRANSITIONS;
  }
}

export function allowedTransitions(type: WorkType, status: string): string[] {
  return transitionMap(type)[status] ?? [];
}

export function canTransition(ctx: WorkflowContext, toStatus: string): { ok: true } | { ok: false; error: string } {
  const allowed = allowedTransitions(ctx.type, ctx.status);
  if (!allowed.includes(toStatus)) {
    return { ok: false, error: `Cannot move from ${ctx.status} to ${toStatus}` };
  }

  if (ctx.type === "Deliverable") {
    if (toStatus === "Ready for Review") {
      if (!ctx.hasOwner) return { ok: false, error: "Owner is required before review (BRULE-02)" };
      if (!ctx.hasDueDate) return { ok: false, error: "Due date is required before review (BRULE-02)" };
      if (!ctx.hasAcceptanceCriteria) {
        return { ok: false, error: "Acceptance criteria are required before review (BRULE-02)" };
      }
      if (!ctx.hasEvidence) return { ok: false, error: "Evidence is required before review (BRULE-02)" };
    }
    if (toStatus === "Accepted" || toStatus === "Rejected") {
      const designated =
        ctx.approverId === ctx.actorId ||
        ["system_admin", "pmo_admin", "project_manager", "team_lead"].includes(ctx.actorRole ?? "");
      if (!designated) {
        return { ok: false, error: "Only designated approvers can accept or reject (FR-025)" };
      }
      if (toStatus === "Accepted" && ctx.ownerId && ctx.ownerId === ctx.actorId && !ctx.selfAcceptException) {
        return { ok: false, error: "A deliverable owner cannot accept their own deliverable (BRULE-03)" };
      }
    }
    if (toStatus === "Rework Required") {
      if (!ctx.comments?.trim() || !ctx.correctiveAction?.trim()) {
        return {
          ok: false,
          error: "Rework requires reviewer comments and corrective-action expectations (BRULE-04)",
        };
      }
    }
  }

  return { ok: true };
}

export type ProjectGate = {
  managerId?: string | null;
  sponsorId?: string | null;
  startDate?: Date | string | null;
  targetEndDate?: Date | string | null;
  hasMilestonePlan?: boolean;
};

export function canMoveProjectToInProgress(project: ProjectGate): { ok: true } | { ok: false; error: string } {
  if (!project.managerId) return { ok: false, error: "Project manager is required (BRULE-01)" };
  if (!project.sponsorId) return { ok: false, error: "Sponsor is required (BRULE-01)" };
  if (!project.startDate) return { ok: false, error: "Start date is required (BRULE-01)" };
  if (!project.targetEndDate) return { ok: false, error: "Target end date is required (BRULE-01)" };
  if (!project.hasMilestonePlan) return { ok: false, error: "Initial milestone plan is required (BRULE-01)" };
  return { ok: true };
}
