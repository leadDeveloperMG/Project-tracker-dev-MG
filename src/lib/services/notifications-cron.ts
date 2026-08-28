import { connectDB } from "@/lib/db";
import { Project } from "@/models/project";
import { WorkItem } from "@/models/work-item";
import { Scorecard, KpiResult } from "@/models/kpi";
import { notify } from "@/lib/services/notify";

export async function dispatchOperationalAlerts() {
  await connectDB();
  const projects = await Project.find({ deletedAt: null });
  let sent = 0;

  for (const project of projects) {
    const overdue = await WorkItem.find({
      projectId: project._id,
      deletedAt: null,
      "flags.overdue": true,
    });
    for (const item of overdue) {
      const targets = [item.assigneeId, project.managerId].filter(Boolean).map(String);
      for (const userId of [...new Set(targets)]) {
        await notify({
          userId,
          type: "overdue",
          title: `${item.key} is overdue`,
          body: `${item.title} in ${project.code}`,
          href: `/projects/${project._id}/work/${item._id}`,
          email: true,
        });
        sent += 1;
      }
    }

    const atRisk = await WorkItem.find({
      projectId: project._id,
      deletedAt: null,
      type: { $in: ["Milestone", "Deliverable"] },
      $or: [{ "flags.blocked": true }, { status: "Blocked" }],
    });
    for (const item of atRisk) {
      const targets = [...project.stakeholderIds, project.managerId].filter(Boolean).map(String);
      for (const userId of [...new Set(targets)]) {
        await notify({
          userId,
          type: "at-risk",
          title: `${item.key} is at risk or blocked`,
          body: item.title,
          href: `/projects/${project._id}/work/${item._id}`,
          email: true,
        });
        sent += 1;
      }
    }

    const ready = await WorkItem.find({
      projectId: project._id,
      type: "Deliverable",
      status: "Ready for Review",
      deletedAt: null,
    });
    for (const item of ready) {
      if (!item.approverId) continue;
      await notify({
        userId: String(item.approverId),
        type: "review",
        title: `${item.key} is ready for review`,
        body: item.title,
        href: `/projects/${project._id}/work/${item._id}`,
        email: true,
      });
      sent += 1;
    }
  }

  const openScorecards = await Scorecard.find({ lockStatus: "open", approvalStatus: { $ne: "approved" } });
  for (const card of openScorecards) {
    if (card.reviewerId) {
      await notify({
        userId: String(card.reviewerId),
        type: "scorecard-deadline",
        title: "Scorecard pending approval",
        body: `Period ending ${new Date(card.periodEnd).toLocaleDateString()}`,
        href: `/scorecards/${card._id}`,
        email: true,
      });
      sent += 1;
    }
  }

  const redKpis = await KpiResult.find({ rag: "red", insufficientData: false }).limit(50);
  for (const kpi of redKpis) {
    if (kpi.approverId) {
      await notify({
        userId: String(kpi.approverId),
        type: "kpi-threshold",
        title: `KPI ${kpi.kpiKey} is below threshold`,
        body: `Actual ${kpi.actualValue} vs target ${kpi.target}`,
        href: "/scorecards",
        email: true,
      });
      sent += 1;
    }
  }

  return sent;
}
