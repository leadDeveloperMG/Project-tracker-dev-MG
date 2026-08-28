import { ROLES, type Role } from "@/lib/constants";

export const PERMISSIONS = {
  manageUsers: ["system_admin", "pmo_admin"],
  manageTemplates: ["system_admin", "pmo_admin"],
  manageCatalog: ["system_admin", "pmo_admin", "hr_reviewer"],
  manageRetention: ["system_admin", "pmo_admin"],
  manageJira: ["system_admin"],
  createProject: ["system_admin", "pmo_admin", "project_manager"],
  viewPortfolio: [
    "system_admin",
    "pmo_admin",
    "executive",
    "project_manager",
    "functional_manager",
    "hr_reviewer",
  ],
  viewAllProjects: ["system_admin", "pmo_admin", "executive"],
  manageProject: ["system_admin", "pmo_admin", "project_manager"],
  assessDeliverable: ["system_admin", "pmo_admin", "project_manager", "team_lead"],
  acceptDeliverable: ["system_admin", "pmo_admin", "project_manager", "team_lead"],
  viewTeamScorecards: [
    "system_admin",
    "pmo_admin",
    "project_manager",
    "team_lead",
    "functional_manager",
    "hr_reviewer",
    "executive",
  ],
  calibrate: ["system_admin", "pmo_admin", "hr_reviewer"],
  overrideHealth: ["system_admin", "pmo_admin", "project_manager"],
  overrideKpi: ["system_admin", "pmo_admin", "project_manager", "functional_manager"],
  lockScorecard: ["system_admin", "pmo_admin", "project_manager", "team_lead", "functional_manager"],
  correctLockedScorecard: ["system_admin", "pmo_admin", "hr_reviewer"],
  viewDataQuality: ["system_admin", "pmo_admin", "project_manager", "executive"],
  scheduleReports: ["system_admin", "pmo_admin", "executive", "project_manager"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: string | undefined, permission: Permission) {
  if (!role || !isRole(role)) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function canViewIndividualScorecard(opts: {
  viewerId: string;
  viewerRole: string;
  subjectId: string;
  managerId?: string | null;
}) {
  if (opts.viewerId === opts.subjectId) return true;
  if (opts.managerId && opts.viewerId === opts.managerId) return true;
  return ["system_admin", "pmo_admin", "hr_reviewer", "functional_manager"].includes(
    opts.viewerRole,
  );
}

export function postLoginPath(role: string | undefined) {
  if (role === "project_manager" || role === "team_lead" || role === "team_member") return "/dashboard";
  if (hasPermission(role, "viewPortfolio")) return "/portfolio";
  return "/dashboard";
}

export const NAV_ITEMS = [
  { href: "/dashboard", label: "My dashboard", permission: null },
  { href: "/portfolio", label: "Portfolio", permission: "viewPortfolio" as Permission },
  { href: "/projects", label: "Projects", permission: null },
  { href: "/team", label: "Team", permission: "assessDeliverable" as Permission },
  { href: "/reviews", label: "Reviews", permission: "assessDeliverable" as Permission },
  { href: "/scorecards", label: "Scorecards", permission: null },
  { href: "/check-ins", label: "Check-ins", permission: null },
  { href: "/calibration", label: "Calibration", permission: "calibrate" as Permission },
  { href: "/annual-reviews", label: "Annual reviews", permission: null },
  { href: "/reports", label: "Reports", permission: "viewPortfolio" as Permission },
  { href: "/admin", label: "Admin", permission: "manageTemplates" as Permission },
] as const;
