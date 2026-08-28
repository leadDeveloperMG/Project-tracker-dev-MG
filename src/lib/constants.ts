export const ROLES = [
  "system_admin",
  "pmo_admin",
  "project_manager",
  "team_lead",
  "team_member",
  "functional_manager",
  "executive",
  "hr_reviewer",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  system_admin: "System administrator",
  pmo_admin: "PMO administrator",
  project_manager: "Project manager",
  team_lead: "Team lead",
  team_member: "Team member",
  functional_manager: "Functional manager",
  executive: "Executive",
  hr_reviewer: "HR reviewer",
};

export const PROJECT_STATUSES = [
  "Proposed",
  "Initiating",
  "Planning",
  "In Progress",
  "On Hold",
  "At Risk",
  "Completed",
  "Cancelled",
  "Closed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const WORK_TYPES = [
  "Epic",
  "Milestone",
  "Deliverable",
  "Task",
  "Sub-task",
  "Risk",
  "Issue",
  "Dependency",
  "Change Request",
  "Decision",
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

export const LINK_TYPES = [
  "blocks",
  "is blocked by",
  "depends on",
  "duplicates",
  "relates to",
] as const;

export type LinkType = (typeof LINK_TYPES)[number];

export const RAG = ["green", "amber", "red"] as const;
export type Rag = (typeof RAG)[number];

export const HEALTH_DIMENSIONS = [
  "scope",
  "schedule",
  "delivery",
  "quality",
  "risks",
  "resources",
  "stakeholders",
] as const;

export type HealthDimension = (typeof HEALTH_DIMENSIONS)[number];

export const TASK_STATUSES = [
  "To Do",
  "In Progress",
  "Blocked",
  "In Review",
  "Done",
  "Cancelled",
] as const;

export const DELIVERABLE_STATUSES = [
  "Draft",
  "In Progress",
  "Ready for Review",
  "Rework Required",
  "Accepted",
  "Rejected",
  "Closed",
] as const;

export const RISK_STATUSES = [
  "Identified",
  "Analyzing",
  "Mitigating",
  "Monitoring",
  "Closed",
  "Accepted",
] as const;

export const CHANGE_STATUSES = [
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected",
  "Implementing",
  "Implemented",
  "Closed",
] as const;

export const GENERIC_STATUSES = ["To Do", "In Progress", "Done", "Cancelled"] as const;

export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SCORE_LABELS: Record<number, string> = {
  1: "Does not meet expectations",
  2: "Partially meets expectations",
  3: "Meets expectations",
  4: "Exceeds expectations",
  5: "Exceptional",
};

export const ASSESSMENT_DIMENSIONS = [
  { key: "timeliness", label: "Timeliness", weight: 20 },
  { key: "quality", label: "Quality", weight: 25 },
  { key: "completeness", label: "Completeness", weight: 20 },
  { key: "acceptanceCriteria", label: "Acceptance-criteria compliance", weight: 15 },
  { key: "collaboration", label: "Collaboration / communication", weight: 10 },
  { key: "rework", label: "Rework", weight: 10 },
] as const;

export const REPORTING_FREQUENCIES = ["Weekly", "Bi-weekly", "Monthly"] as const;

export const MEASUREMENT_PERIODS = [
  "annual",
  "monthly",
  "quarterly",
  "project-phase",
  "project-end",
] as const;

export const KPI_DIRECTIONS = ["higher-is-better", "lower-is-better", "range"] as const;
export type KpiDirection = (typeof KPI_DIRECTIONS)[number];

export const SCORECARD_SUBJECT_TYPES = ["member", "team", "project"] as const;

export const CALCULATION_VERSION = "1.0.0";
