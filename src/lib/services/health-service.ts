import { connectDB } from "@/lib/db";
import { Project } from "@/models/project";
import { WorkItem } from "@/models/work-item";
import { Assessment } from "@/models/assessment";
import { StatusReport } from "@/models/assessment";
import { recommendHealth, overallRag } from "@/lib/engines/health";
import { HEALTH_DIMENSIONS } from "@/lib/constants";

export async function refreshProjectHealth(projectId: string) {
  await connectDB();
  const project = await Project.findById(projectId);
  if (!project) return null;
  const items = await WorkItem.find({ projectId, deletedAt: null });
  const assessments = await Assessment.find({ projectId });
  const reports = await StatusReport.find({ projectId });

  const milestones = items.filter((i) => i.type === "Milestone");
  const deliverables = items.filter((i) => i.type === "Deliverable");
  const overdueMilestones = milestones.filter((i) => i.flags?.overdue).length;
  const completionRate =
    items.length === 0
      ? 100
      : (items.filter((i) => ["Done", "Accepted", "Closed", "Implemented"].includes(i.status)).length / items.length) *
        100;
  const committed = items.filter((i) => i.committed);
  const commitmentCompletion = committed.length
    ? (committed.filter((i) => ["Done", "Accepted", "Closed"].includes(i.status)).length / committed.length) * 100
    : 100;
  const reviewed = deliverables.filter((i) => i.reviewed || ["Accepted", "Rejected", "Closed"].includes(i.status));
  const firstPass = reviewed.length
    ? (reviewed.filter((i) => i.firstPassAccepted && i.reworkCount === 0).length / reviewed.length) * 100
    : 100;
  const reworkRate = reviewed.length
    ? (reviewed.filter((i) => i.reworkCount > 0).length / reviewed.length) * 100
    : 0;
  const assessmentScoreAvg = assessments.length
    ? assessments.reduce((s, a) => s + a.overallScore, 0) / assessments.length
    : null;
  const openRiskExposure = items
    .filter((i) => i.type === "Risk" && !["Closed", "Accepted"].includes(i.status))
    .reduce((s, i) => s + (i.exposure ?? (i.likelihood ?? 1) * (i.impact ?? 1)), 0);
  const end = project.targetEndDate ? new Date(project.targetEndDate).getTime() : Date.now();
  const forecast = items
    .filter((i) => i.forecastDate)
    .map((i) => new Date(i.forecastDate as Date).getTime());
  const maxForecast = forecast.length ? Math.max(...forecast) : end;
  const scheduleVarianceDays = Math.round((maxForecast - end) / 86400000);

  const recommended = recommendHealth({
    overdueMilestones,
    dueMilestones: milestones.length,
    scheduleVarianceDays,
    criticalBlockedDependencies: items.filter((i) => i.type === "Dependency" && i.flags?.blocked && i.priority === "Critical")
      .length,
    completionRate,
    overdueDeliverables: deliverables.filter((i) => i.flags?.overdue).length,
    commitmentCompletion,
    unacceptedDeliverables: deliverables.filter((i) => !["Accepted", "Closed"].includes(i.status)).length,
    firstPassAcceptance: firstPass,
    reworkRate,
    assessmentScoreAvg,
    openRiskExposure,
    unassignedWork: items.filter((i) => i.flags?.unassigned).length,
    staleWork: items.filter((i) => i.flags?.stale).length,
    overdueStatusReports: reports.filter((r) => !r.onTime && !r.submittedAt).length,
    missingStakeholderUpdates: reports.filter((r) => !r.submittedAt).length,
    scopeChangeRate: items.filter((i) => i.type === "Change Request" && ["Approved", "Implementing", "Implemented"].includes(i.status))
      .length,
  });

  for (const dim of HEALTH_DIMENSIONS) {
    const current = project.health[dim];
    if (current?.source === "override") {
      project.health[dim] = { ...current, score: recommended[dim].score };
    } else {
      project.health[dim] = recommended[dim];
    }
  }
  project.overallRag = overallRag(project.health as Parameters<typeof overallRag>[0]);
  await project.save();
  return project;
}
