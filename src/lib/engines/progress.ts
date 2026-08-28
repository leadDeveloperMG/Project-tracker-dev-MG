export type ProgressChild = {
  progress: number;
  weight?: number;
  status?: string;
};

export type ProgressMode = "child-item" | "weighted-completion" | "manual";

export function clampProgress(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function calculateProgress(
  mode: ProgressMode,
  children: ProgressChild[],
  manualValue?: number | null,
  doneStatuses: string[] = ["Done", "Accepted", "Closed", "Implemented"],
): number {
  if (mode === "manual") {
    return clampProgress(manualValue ?? 0);
  }
  if (!children.length) {
    return clampProgress(manualValue ?? 0);
  }
  if (mode === "child-item") {
    const done = children.filter((c) => doneStatuses.includes(c.status ?? "")).length;
    return clampProgress((done / children.length) * 100);
  }
  const totalWeight = children.reduce((sum, c) => sum + (c.weight ?? 1), 0) || 1;
  const earned = children.reduce((sum, c) => sum + ((c.weight ?? 1) * clampProgress(c.progress)) / 100, 0);
  return clampProgress((earned / totalWeight) * 100);
}

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

export function computeFlags(item: {
  type: string;
  status: string;
  assigneeId?: string | null;
  dueDate?: Date | string | null;
  updatedAt?: Date | string | null;
  blocked?: boolean;
  acceptanceCriteria?: string | null;
  title?: string;
}): {
  overdue: boolean;
  blocked: boolean;
  unassigned: boolean;
  stale: boolean;
  missingData: boolean;
} {
  const open = !["Done", "Accepted", "Rejected", "Closed", "Cancelled", "Implemented"].includes(item.status);
  const due = item.dueDate ? new Date(item.dueDate) : null;
  const overdue = Boolean(open && due && due.getTime() < Date.now());
  const unassigned = open && !item.assigneeId;
  const updated = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
  const stale = open && updated > 0 && Date.now() - updated > STALE_MS;
  const missingData =
    !item.title ||
    (["Deliverable", "Milestone", "Task"].includes(item.type) && !item.assigneeId) ||
    (["Deliverable", "Milestone", "Task"].includes(item.type) && !item.dueDate) ||
    (item.type === "Deliverable" && !item.acceptanceCriteria);
  return {
    overdue,
    blocked: Boolean(item.blocked) || item.status === "Blocked",
    unassigned: Boolean(unassigned),
    stale,
    missingData,
  };
}
