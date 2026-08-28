import { connectDB } from "@/lib/db";
import { RetentionPolicy, Notification } from "@/models/performance";
import { AuditLog } from "@/models/audit";
import { WorkItem } from "@/models/work-item";
import { Scorecard, KpiResult } from "@/models/kpi";

const MODEL_MAP = {
  AuditLog,
  Notification,
  WorkItem,
  Scorecard,
  KpiResult,
} as const;

export async function applyRetentionPolicies() {
  await connectDB();
  const policies = await RetentionPolicy.find({});
  const summary: Record<string, number> = {};
  for (const policy of policies) {
    const Model = MODEL_MAP[policy.entityType as keyof typeof MODEL_MAP];
    if (!Model) continue;
    const cutoff = new Date(Date.now() - policy.retainDays * 86400000);
    if (policy.action === "delete") {
      const res = await Model.deleteMany({ createdAt: { $lt: cutoff } });
      summary[policy.entityType] = res.deletedCount ?? 0;
    } else if (policy.entityType === "WorkItem") {
      const res = await WorkItem.updateMany(
        { createdAt: { $lt: cutoff }, deletedAt: null },
        { deletedAt: new Date() },
      );
      summary[policy.entityType] = res.modifiedCount ?? 0;
    } else {
      const res = await Model.deleteMany({ createdAt: { $lt: cutoff } });
      summary[policy.entityType] = res.deletedCount ?? 0;
    }
  }
  return summary;
}
