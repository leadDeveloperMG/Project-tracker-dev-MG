import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { computeFlags } from "@/lib/engines/progress";

export async function refreshFlags(projectId?: string) {
  await connectDB();
  const filter = projectId ? { projectId, deletedAt: null } : { deletedAt: null };
  const items = await WorkItem.find(filter);
  let updated = 0;
  for (const item of items) {
    const flags = computeFlags({
      type: item.type,
      status: item.status,
      assigneeId: item.assigneeId ? String(item.assigneeId) : null,
      dueDate: item.dueDate,
      updatedAt: item.updatedAt,
      blocked: item.blocked,
      acceptanceCriteria: item.acceptanceCriteria,
      title: item.title,
    });
    item.flags = flags;
    item.blocked = flags.blocked;
    await item.save();
    updated += 1;
  }
  return updated;
}
