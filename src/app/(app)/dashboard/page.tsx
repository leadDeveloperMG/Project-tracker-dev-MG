import Link from "next/link";
import mongoose from "mongoose";
import { requireUser } from "@/lib/session";
import { accessibleProjects } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { StatusReport } from "@/models/assessment";
import { Scorecard } from "@/models/kpi";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, RagBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export default async function PmDashboardPage() {
  const user = await requireUser();
  await connectDB();
  const projects = await accessibleProjects(user);
  const ids = projects.map((p) => p._id);
  const mine = new mongoose.Types.ObjectId(user.id);
  const assigned = await WorkItem.find({
    projectId: { $in: ids },
    deletedAt: null,
    assigneeId: mine,
    status: { $nin: ["Done", "Accepted", "Closed", "Cancelled", "Implemented"] },
  })
    .sort({ dueDate: 1 })
    .limit(12);
  const reviewQueue = await WorkItem.find({
    projectId: { $in: ids },
    deletedAt: null,
    type: "Deliverable",
    status: "Ready for Review",
    $or: [{ approverId: mine }, { assigneeId: { $ne: mine } }],
  }).limit(12);
  const overdue = await WorkItem.find({
    projectId: { $in: ids },
    deletedAt: null,
    "flags.overdue": true,
  })
    .sort({ dueDate: 1 })
    .limit(10);
  const blocked = await WorkItem.find({
    projectId: { $in: ids },
    deletedAt: null,
    $or: [{ blocked: true }, { status: "Blocked" }],
  }).limit(8);
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 86400000);
  const upcoming = await WorkItem.find({
    projectId: { $in: ids },
    deletedAt: null,
    dueDate: { $gte: now, $lte: horizon },
    status: { $nin: ["Done", "Accepted", "Closed", "Cancelled"] },
  })
    .sort({ dueDate: 1 })
    .limit(10);
  const quality = await WorkItem.find({
    projectId: { $in: ids },
    deletedAt: null,
    $or: [{ "flags.missingData": true }, { "flags.unassigned": true }, { "flags.stale": true }],
  }).limit(8);
  const reports = await StatusReport.find({ projectId: { $in: ids } })
    .sort({ periodEnd: -1 })
    .limit(projects.length);
  const myScorecard = await Scorecard.findOne({
    subjectType: "member",
    subjectId: user.id,
  }).sort({ periodEnd: -1 });
  const title =
    user.role === "team_member"
      ? "My dashboard"
      : user.role === "team_lead"
        ? "Team-lead dashboard"
        : "PM dashboard";

  return (
    <>
      <PageHeader
        title={title}
        description={`${ROLE_LABELS[user.role as Role] ?? user.role}: assigned work, reviews, exceptions, and health for projects you can access.`}
        actions={
          <div className="flex gap-2">
            {myScorecard ? (
              <Link href={`/scorecards/${myScorecard._id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                My scorecard
              </Link>
            ) : null}
            <Link href="/projects" className={cn(buttonVariants({ variant: "outline" }))}>
              All projects
            </Link>
          </div>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>My open work</CardDescription>
            <CardTitle className="text-2xl">{assigned.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Ready for review</CardDescription>
            <CardTitle className="text-2xl">{reviewQueue.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-2xl">{overdue.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Blocked</CardDescription>
            <CardTitle className="text-2xl">{blocked.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My projects</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {projects.map((p) => (
              <Link
                key={String(p._id)}
                href={`/projects/${p._id}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted"
              >
                <span>
                  <span className="font-medium">{p.code}</span> {p.name}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone="slate">{p.status}</Badge>
                  <RagBadge value={p.overallRag} />
                </span>
              </Link>
            ))}
            {!projects.length ? <p className="text-sm text-muted-foreground">No projects assigned.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assigned to me</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {assigned.map((i) => (
              <Link key={String(i._id)} href={`/projects/${i.projectId}/work/${i._id}`} className="flex justify-between hover:underline">
                <span>
                  {i.key} {i.title}
                </span>
                <span className="text-muted-foreground">{fmtDate(i.dueDate)}</span>
              </Link>
            ))}
            {!assigned.length ? <p className="text-muted-foreground">Nothing assigned.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Review queue</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {reviewQueue.map((i) => (
              <Link key={String(i._id)} href={`/projects/${i.projectId}/work/${i._id}`} className="hover:underline">
                {i.key} {i.title} · {i.status}
              </Link>
            ))}
            {!reviewQueue.length ? <p className="text-muted-foreground">No deliverables waiting.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overdue & blocked</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {overdue.map((i) => (
              <Link key={String(i._id)} href={`/projects/${i.projectId}/work/${i._id}`} className="flex justify-between hover:underline">
                <span>
                  {i.key} {i.title}
                </span>
                <Badge tone="red">overdue</Badge>
              </Link>
            ))}
            {blocked.map((i) => (
              <Link key={`b-${String(i._id)}`} href={`/projects/${i.projectId}/work/${i._id}`} className="flex justify-between hover:underline">
                <span>
                  {i.key} {i.title}
                </span>
                <Badge tone="amber">blocked</Badge>
              </Link>
            ))}
            {!overdue.length && !blocked.length ? <p className="text-muted-foreground">No exceptions.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Due in 14 days</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {upcoming.map((i) => (
              <Link key={String(i._id)} href={`/projects/${i.projectId}/work/${i._id}`} className="flex justify-between hover:underline">
                <span>
                  {i.key} {i.title}
                </span>
                <span className="text-muted-foreground">{fmtDate(i.dueDate)}</span>
              </Link>
            ))}
            {!upcoming.length ? <p className="text-muted-foreground">Nothing due soon.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data quality</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {quality.map((i) => (
              <Link key={String(i._id)} href={`/projects/${i.projectId}/work/${i._id}`} className="hover:underline">
                {i.key} {i.title}
                {i.flags.missingData ? " · missing data" : ""}
                {i.flags.unassigned ? " · unassigned" : ""}
                {i.flags.stale ? " · stale" : ""}
              </Link>
            ))}
            {!quality.length ? <p className="text-muted-foreground">No data-quality flags.</p> : null}
            <p className="pt-2 text-muted-foreground">
              Latest reports: {reports.filter((r) => r.onTime).length} on time / {reports.length} recent.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
