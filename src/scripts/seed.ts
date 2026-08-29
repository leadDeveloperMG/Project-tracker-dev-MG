import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db";
import { User, Team } from "../models/user";
import { Project, ProjectTemplate } from "../models/project";
import { WorkItem } from "../models/work-item";
import { Assessment, StatusReport } from "../models/assessment";
import { KraCatalog, KpiCatalog, ScorecardTemplate, Scorecard, KpiResult } from "../models/kpi";
import { CheckIn, AnnualReview, RetentionPolicy, Notification } from "../models/performance";
import { AuditLog, writeAudit } from "../models/audit";
import { refreshFlags } from "../lib/services/flags-service";
import { refreshProjectHealth } from "../lib/services/health-service";
import { refreshKpiResults, buildScorecard } from "../lib/services/kpi-service";
import { initialStatus } from "../lib/engines/workflow";
import { computeFlags } from "../lib/engines/progress";
import { currentQuarterBounds } from "../lib/dates";
import type { Role } from "../lib/constants";

const PASSWORD = "Password123!";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of text.split(/\r?\n/)) {
        if (!line || line.startsWith("#")) continue;
        const i = line.indexOf("=");
        if (i === -1) continue;
        const key = line.slice(0, i).trim();
        const value = line.slice(i + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      /* optional */
    }
  }
}

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) {
    throw new Error("Set MONGODB_URI before seeding");
  }
  await connectDB();
  const hash = await bcrypt.hash(PASSWORD, 10);

  await Promise.all([
    User.deleteMany({}),
    Team.deleteMany({}),
    ProjectTemplate.deleteMany({}),
    Project.deleteMany({}),
    WorkItem.deleteMany({}),
    Assessment.deleteMany({}),
    StatusReport.deleteMany({}),
    KraCatalog.deleteMany({}),
    KpiCatalog.deleteMany({}),
    ScorecardTemplate.deleteMany({}),
    Scorecard.deleteMany({}),
    KpiResult.deleteMany({}),
    CheckIn.deleteMany({}),
    AnnualReview.deleteMany({}),
    RetentionPolicy.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const users: Record<string, InstanceType<typeof User>> = {};
  const specs: { key: string; name: string; email: string; role: Role }[] = [
    { key: "admin", name: "Ava Admin", email: "admin@tracker.local", role: "system_admin" },
    { key: "dev", name: "Dana Developer", email: "developer@tracker.local", role: "system_admin" },
    { key: "pmo", name: "Priya PMO", email: "pmo@tracker.local", role: "pmo_admin" },
    { key: "exec", name: "Elena Exec", email: "exec@tracker.local", role: "executive" },
    { key: "hr", name: "Hugo HR", email: "hr@tracker.local", role: "hr_reviewer" },
    { key: "fm", name: "Farah Functional", email: "fm@tracker.local", role: "functional_manager" },
    { key: "pm", name: "Marco PM", email: "pm@tracker.local", role: "project_manager" },
    { key: "lead", name: "Lina Lead", email: "lead@tracker.local", role: "team_lead" },
    { key: "member", name: "Noah Member", email: "member@tracker.local", role: "team_member" },
  ];
  for (const spec of specs) {
    users[spec.key] = await User.create({
      name: spec.name,
      email: spec.email,
      role: spec.role,
      passwordHash: hash,
      active: true,
    });
  }
  users.pm.managerId = users.fm._id;
  users.lead.managerId = users.pm._id;
  users.member.managerId = users.lead._id;
  await Promise.all([users.pm.save(), users.lead.save(), users.member.save()]);

  const team = await Team.create({
    name: "Digital Delivery",
    functionalArea: "Technology",
    managerId: users.lead._id,
    memberIds: [users.pm._id, users.lead._id, users.member._id],
    active: true,
  });
  await User.updateMany({ _id: { $in: team.memberIds } }, { teamId: team._id });

  const template = await ProjectTemplate.create({
    name: "Standard delivery template",
    description: "PMO-approved initiation template with mandatory charter fields and milestone skeleton.",
    projectType: "Delivery",
    reportingFrequency: "Weekly",
    defaultMilestones: [
      { name: "Kickoff complete", offsetDays: 7 },
      { name: "Design baseline", offsetDays: 30 },
      { name: "UAT start", offsetDays: 60 },
      { name: "Go-live", offsetDays: 90 },
    ],
    active: true,
  });
  await ProjectTemplate.create({
    name: "Compliance initiative",
    description: "Shorter governance template for policy and audit work.",
    projectType: "Compliance",
    reportingFrequency: "Bi-weekly",
    defaultMilestones: [
      { name: "Scope agreed", offsetDays: 14 },
      { name: "Control design", offsetDays: 45 },
      { name: "Evidence pack", offsetDays: 75 },
    ],
    active: true,
  });

  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  const end = new Date();
  end.setMonth(end.getMonth() + 2);

  const project = await Project.create({
    name: "Customer Portal Revamp",
    code: "CPR",
    templateId: template._id,
    sponsorId: users.exec._id,
    managerId: users.pm._id,
    teamLeadId: users.lead._id,
    businessUnit: "Retail",
    strategicObjective: "Reduce self-service cycle time and raise NPS",
    startDate: start,
    targetEndDate: end,
    projectType: "Delivery",
    reportingFrequency: "Weekly",
    status: "In Progress",
    charter: "Rebuild the customer portal with governed milestones, quality gates, and weekly health reporting.",
    scopeBaseline: "Authentication, dashboard, billing history, and support case intake. Out of scope: native mobile apps.",
    periodGoals: "Ship billing history and close design baseline this quarter. Confirm SSO vendor dates.",
    goalsConfirmedAt: new Date(),
    teamMemberIds: [users.pm._id, users.lead._id, users.member._id],
    stakeholderIds: [users.exec._id, users.fm._id],
    reviewerIds: [users.lead._id],
    approverIds: [users.pm._id, users.lead._id],
    counter: 0,
  });

  async function addItem(data: Record<string, unknown>) {
    project.counter += 1;
    const item = await WorkItem.create({
      key: `CPR-${project.counter}`,
      projectId: project._id,
      status: initialStatus((data.type as string) as never),
      priority: "Medium",
      progressMode: "child-item",
      progress: 0,
      ...data,
    });
    item.flags = computeFlags({
      type: item.type,
      status: item.status,
      assigneeId: item.assigneeId ? String(item.assigneeId) : null,
      dueDate: item.dueDate,
      updatedAt: item.updatedAt,
      blocked: item.blocked,
      acceptanceCriteria: item.acceptanceCriteria,
      title: item.title,
    });
    await item.save();
    return item;
  }

  await addItem({
    type: "Milestone",
    title: "Kickoff complete",
    assigneeId: users.pm._id,
    status: "Done",
    dueDate: new Date(start.getTime() + 7 * 86400000),
    baselineDate: new Date(start.getTime() + 7 * 86400000),
    actualDate: new Date(start.getTime() + 6 * 86400000),
    committed: true,
    progress: 100,
  });
  await addItem({
    type: "Milestone",
    title: "Design baseline",
    assigneeId: users.lead._id,
    status: "In Progress",
    dueDate: new Date(Date.now() - 2 * 86400000),
    baselineDate: new Date(Date.now() - 2 * 86400000),
    forecastDate: new Date(Date.now() + 5 * 86400000),
    committed: true,
  });
  await addItem({
    type: "Epic",
    title: "Portal experience",
    assigneeId: users.lead._id,
    status: "In Progress",
    description: "Workstream covering UX, auth, and billing views.",
  });
  const ux = await addItem({
    type: "Deliverable",
    title: "UX design pack",
    assigneeId: users.member._id,
    approverId: users.lead._id,
    status: "Ready for Review",
    dueDate: new Date(),
    plannedDate: start,
    baselineDate: start,
    acceptanceCriteria: "Approved wireframes, accessibility notes, and Figma link.",
    committed: true,
    comments: [{ authorId: users.member._id, body: "Draft attached for review.", createdAt: new Date() }],
    attachments: [
      {
        name: "ux-evidence.txt",
        url: "https://example.com/evidence/ux-pack",
        uploadedBy: users.member._id,
        uploadedAt: new Date(),
      },
    ],
  });
  const api = await addItem({
    type: "Deliverable",
    title: "Billing API contract",
    assigneeId: users.member._id,
    approverId: users.pm._id,
    status: "Accepted",
    dueDate: new Date(Date.now() - 10 * 86400000),
    actualDate: new Date(Date.now() - 12 * 86400000),
    acceptanceCriteria: "OpenAPI spec reviewed and accepted.",
    committed: true,
    firstPassAccepted: true,
    reviewed: true,
    progress: 100,
  });
  await addItem({
    type: "Task",
    title: "Implement login page",
    parentId: ux._id,
    assigneeId: users.member._id,
    status: "In Progress",
    dueDate: new Date(Date.now() + 3 * 86400000),
    committed: true,
  });
  await addItem({
    type: "Risk",
    title: "SSO vendor delay",
    assigneeId: users.pm._id,
    status: "Mitigating",
    likelihood: 4,
    impact: 5,
    exposure: 20,
    mitigation: "Fallback local accounts for pilot; weekly vendor checkpoint.",
    dueDate: new Date(Date.now() + 14 * 86400000),
    priority: "Critical",
  });
  await addItem({
    type: "Issue",
    title: "Staging environment quota",
    assigneeId: users.lead._id,
    status: "Blocked",
    blocked: true,
    blockerOpenedAt: new Date(Date.now() - 3 * 86400000),
    dueDate: new Date(Date.now() - 1 * 86400000),
  });
  await addItem({
    type: "Change Request",
    title: "Add statement download",
    assigneeId: users.pm._id,
    status: "Under Review",
    description: "Sponsor requested PDF statements in MVP.",
  });
  await addItem({
    type: "Decision",
    title: "Use existing identity provider",
    assigneeId: users.exec._id,
    status: "Done",
    decision: "Reuse corporate IdP; no custom auth.",
  });
  await addItem({
    type: "Dependency",
    title: "Core billing service freeze window",
    assigneeId: users.pm._id,
    status: "In Progress",
    priority: "High",
    links: [{ type: "blocks", targetId: api._id }],
  });

  await project.save();

  const planningStart = new Date();
  const planningEnd = new Date();
  planningEnd.setMonth(planningEnd.getMonth() + 4);
  const second = await Project.create({
    name: "Branch Network Upgrade",
    code: "BNU",
    templateId: template._id,
    sponsorId: users.exec._id,
    managerId: users.pm._id,
    teamLeadId: users.lead._id,
    businessUnit: "Operations",
    strategicObjective: "Refresh branch connectivity and reduce incident volume",
    startDate: planningStart,
    targetEndDate: planningEnd,
    projectType: "Delivery",
    reportingFrequency: "Weekly",
    status: "Planning",
    charter: "Upgrade WAN links and standardise branch router images.",
    scopeBaseline: "40 branches. Out of scope: ATM estate.",
    teamMemberIds: [users.pm._id, users.lead._id],
    stakeholderIds: [users.exec._id],
    reviewerIds: [users.lead._id],
    approverIds: [users.pm._id],
    counter: 1,
  });
  await WorkItem.create({
    key: "BNU-1",
    projectId: second._id,
    type: "Milestone",
    title: "Pilot branch complete",
    status: "To Do",
    assigneeId: users.pm._id,
    dueDate: new Date(Date.now() + 30 * 86400000),
    baselineDate: new Date(Date.now() + 30 * 86400000),
    plannedDate: new Date(Date.now() + 30 * 86400000),
  });

  await Assessment.create({
    deliverableId: api._id,
    projectId: project._id,
    dimensions: [
      { key: "timeliness", label: "Timeliness", weight: 20, score: 5, comments: "Early" },
      { key: "quality", label: "Quality", weight: 25, score: 4, comments: "Clear spec" },
      { key: "completeness", label: "Completeness", weight: 20, score: 4, comments: "" },
      { key: "acceptanceCriteria", label: "AC compliance", weight: 15, score: 5, comments: "" },
      { key: "collaboration", label: "Collaboration", weight: 10, score: 4, comments: "" },
      { key: "rework", label: "Rework", weight: 10, score: 5, comments: "None" },
    ],
    overallScore: 4.45,
    reviewerId: users.lead._id,
    reviewDate: new Date(),
    comments: "Accepted first pass.",
  });

  await StatusReport.create({
    projectId: project._id,
    periodStart: new Date(Date.now() - 7 * 86400000),
    periodEnd: new Date(),
    accomplishments: "Billing API accepted. UX pack in review.",
    nextPeriodPlans: "Close design baseline and unblock staging.",
    blockers: "SSO vendor and staging quota.",
    decisionsNeeded: "Confirm statement-download change.",
    risks: "SSO delay may slip go-live.",
    overallHealth: "amber",
    submittedAt: new Date(),
    submittedBy: users.pm._id,
    onTime: true,
  });

  const catalog: {
    role: Role;
    kras: { name: string; weight: number; kpis: { key: string; name: string; target: number; weight: number; direction: "higher-is-better" | "lower-is-better"; green: number; amber: number; minSample: number }[] }[];
  }[] = [
    {
      role: "project_manager",
      kras: [
        {
          name: "Delivery predictability",
          weight: 30,
          kpis: [
            { key: "milestone_adherence", name: "Milestone adherence", target: 90, weight: 50, direction: "higher-is-better", green: 90, amber: 75, minSample: 2 },
            { key: "on_time_deliverable_rate", name: "On-time deliverable rate", target: 90, weight: 50, direction: "higher-is-better", green: 90, amber: 80, minSample: 2 },
          ],
        },
        {
          name: "Scope, risk, and governance",
          weight: 25,
          kpis: [{ key: "high_risk_exposure", name: "High-risk exposure", target: 8, weight: 100, direction: "lower-is-better", green: 8, amber: 15, minSample: 1 }],
        },
        {
          name: "Quality and acceptance",
          weight: 20,
          kpis: [
            { key: "first_pass_acceptance", name: "First-pass acceptance", target: 90, weight: 60, direction: "higher-is-better", green: 90, amber: 80, minSample: 1 },
            { key: "rework_rate", name: "Rework rate", target: 10, weight: 40, direction: "lower-is-better", green: 10, amber: 20, minSample: 1 },
          ],
        },
        {
          name: "Stakeholder management",
          weight: 15,
          kpis: [{ key: "status_report_compliance", name: "Status-report compliance", target: 95, weight: 100, direction: "higher-is-better", green: 95, amber: 85, minSample: 1 }],
        },
        {
          name: "Team leadership and capability",
          weight: 10,
          kpis: [{ key: "commitment_completion", name: "Commitment completion", target: 90, weight: 100, direction: "higher-is-better", green: 90, amber: 75, minSample: 2 }],
        },
      ],
    },
    {
      role: "team_lead",
      kras: [
        {
          name: "Delivery reliability",
          weight: 35,
          kpis: [{ key: "commitment_completion", name: "Commitment completion", target: 90, weight: 100, direction: "higher-is-better", green: 90, amber: 75, minSample: 2 }],
        },
        {
          name: "Quality",
          weight: 25,
          kpis: [{ key: "first_pass_acceptance", name: "First-pass acceptance", target: 90, weight: 100, direction: "higher-is-better", green: 90, amber: 80, minSample: 1 }],
        },
        {
          name: "Risk and issue management",
          weight: 15,
          kpis: [{ key: "blocker_resolution_time", name: "Blocker resolution time (hours)", target: 24, weight: 100, direction: "lower-is-better", green: 24, amber: 48, minSample: 1 }],
        },
        {
          name: "Stakeholder value",
          weight: 15,
          kpis: [{ key: "on_time_deliverable_rate", name: "On-time deliverable rate", target: 90, weight: 100, direction: "higher-is-better", green: 90, amber: 80, minSample: 2 }],
        },
        {
          name: "Process and data discipline",
          weight: 10,
          kpis: [{ key: "status_report_compliance", name: "Status-report compliance", target: 95, weight: 100, direction: "higher-is-better", green: 95, amber: 85, minSample: 1 }],
        },
      ],
    },
    {
      role: "team_member",
      kras: [
        {
          name: "Delivery commitments",
          weight: 35,
          kpis: [{ key: "on_time_deliverable_rate", name: "On-time assigned deliverables", target: 90, weight: 100, direction: "higher-is-better", green: 90, amber: 80, minSample: 1 }],
        },
        {
          name: "Quality of output",
          weight: 30,
          kpis: [
            { key: "first_pass_acceptance", name: "First-pass acceptance", target: 90, weight: 50, direction: "higher-is-better", green: 90, amber: 80, minSample: 1 },
            { key: "rework_rate", name: "Rework rate", target: 10, weight: 50, direction: "lower-is-better", green: 10, amber: 20, minSample: 1 },
          ],
        },
        {
          name: "Collaboration and ownership",
          weight: 20,
          kpis: [{ key: "commitment_completion", name: "Committed-work completion", target: 90, weight: 100, direction: "higher-is-better", green: 90, amber: 75, minSample: 1 }],
        },
        {
          name: "Process compliance",
          weight: 15,
          kpis: [{ key: "status_report_compliance", name: "Timely updates", target: 95, weight: 100, direction: "higher-is-better", green: 95, amber: 85, minSample: 1 }],
        },
      ],
    },
  ];

  for (const pack of catalog) {
    const kraIds = [];
    for (const kraDef of pack.kras) {
      const kra = await KraCatalog.create({
        name: kraDef.name,
        description: kraDef.name,
        applicableRole: pack.role,
        weight: kraDef.weight,
        ownerRole: "pmo_admin",
        period: "quarterly",
        approvalStatus: "approved",
      });
      kraIds.push(kra._id);
      for (const kpi of kraDef.kpis) {
        const ownerTypes =
          pack.role === "project_manager"
            ? (["member", "project"] as const)
            : pack.role === "team_lead"
              ? (["member", "team"] as const)
              : (["member"] as const);
        for (const ownerType of ownerTypes) {
          await KpiCatalog.create({
            key: kpi.key,
            name: kpi.name,
            description: kpi.name,
            kraId: kra._id,
            ownerType,
            formula: kpi.key,
            target: kpi.target,
            thresholdBands: { green: kpi.green, amber: kpi.amber },
            weight: kpi.weight,
            measurementPeriod: "quarterly",
            dataSource: "calculated",
            direction: kpi.direction,
            approvalStatus: "approved",
            minSampleSize: kpi.minSample,
            qualityGuardrail:
              kpi.key === "on_time_deliverable_rate" ? { metric: "rework_rate", max: 20 } : undefined,
          });
        }
      }
    }
    await ScorecardTemplate.create({
      name: `${pack.role} scorecard`,
      role: pack.role,
      kraIds,
      approvalStatus: "approved",
    });
  }

  await RetentionPolicy.insertMany([
    { entityType: "AuditLog", retainDays: 2555, action: "archive" },
    { entityType: "Notification", retainDays: 365, action: "delete" },
    { entityType: "Scorecard", retainDays: 2555, action: "archive" },
      { entityType: "WorkItem", retainDays: 2555, action: "archive" },
      { entityType: "KpiResult", retainDays: 2555, action: "archive" },
  ]);

  await CheckIn.create({
    managerId: users.lead._id,
    memberId: users.member._id,
    date: new Date(),
    progressNotes: "UX pack submitted; waiting on review.",
    feedback: "Strong collaboration with design.",
    constraints: "Staging quota.",
    developmentActions: "Shadow the API review next sprint.",
    followUpDate: new Date(Date.now() + 30 * 86400000),
  });

  await AnnualReview.create({
    memberId: users.member._id,
    year: new Date().getFullYear(),
    consolidatedScore: null,
    managerComments: "Draft only — not a final rating.",
    qualitativeEvidence: "Pilot period qualitative notes.",
    developmentOutcomes: "Improved estimation hygiene.",
    futureGoals: "Own a deliverable end-to-end next quarter.",
    approvalStatus: "draft",
    reviewerId: users.lead._id,
  });

  await refreshFlags(String(project._id));
  await refreshProjectHealth(String(project._id));
  await refreshFlags(String(second._id));
  await refreshProjectHealth(String(second._id));

  const { start: qStart, end: qEnd } = currentQuarterBounds();
  await refreshKpiResults(qStart, qEnd);
  await buildScorecard({
    subjectType: "member",
    subjectId: String(users.member._id),
    role: "team_member",
    periodStart: qStart,
    periodEnd: qEnd,
  });
  await buildScorecard({
    subjectType: "member",
    subjectId: String(users.pm._id),
    role: "project_manager",
    periodStart: qStart,
    periodEnd: qEnd,
  });
  await buildScorecard({
    subjectType: "team",
    subjectId: String(team._id),
    role: "team_lead",
    periodStart: qStart,
    periodEnd: qEnd,
  });
  await buildScorecard({
    subjectType: "project",
    subjectId: String(project._id),
    role: "project_manager",
    periodStart: qStart,
    periodEnd: qEnd,
  });

  await writeAudit({
    actorId: String(users.admin._id),
    action: "seed",
    entityType: "System",
    entityId: "seed",
    after: { project: project.code, second: second.code },
  });
  await writeAudit({
    actorId: String(users.pm._id),
    action: "project.create",
    entityType: "Project",
    entityId: String(project._id),
    after: { name: project.name, code: project.code },
  });
  await writeAudit({
    actorId: String(users.lead._id),
    action: "work.transition",
    entityType: "WorkItem",
    entityId: String(api._id),
    before: { status: "Ready for Review" },
    after: { status: "Accepted" },
    reason: "First-pass accepted",
  });

  console.log("Seed complete.");
  console.log("Password for all demo users: Password123!");
  console.log("Try developer@tracker.local, pm@tracker.local, exec@tracker.local, admin@tracker.local");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
