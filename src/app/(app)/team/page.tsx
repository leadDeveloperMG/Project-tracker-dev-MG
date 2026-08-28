import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { accessibleProjects } from "@/lib/access";
import { WorkItem } from "@/models/work-item";
import { Scorecard } from "@/models/kpi";
import { User } from "@/models/user";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function TeamDashboardPage() {
  const user = await requireUser();
  await connectDB();
  const projects = await accessibleProjects(user);
  const ids = projects.map((p) => p._id);
  const pending = await WorkItem.find({
    projectId: { $in: ids },
    type: "Deliverable",
    status: { $in: ["Ready for Review", "Rework Required"] },
    deletedAt: null,
  }).lean();
  const workload = await WorkItem.aggregate([
    { $match: { projectId: { $in: ids }, deletedAt: null, assigneeId: { $ne: null } } },
    { $group: { _id: "$assigneeId", open: { $sum: 1 }, overdue: { $sum: { $cond: ["$flags.overdue", 1, 0] } } } },
  ]);
  const users = await User.find({ _id: { $in: workload.map((w) => w._id) } }).lean();
  const rework = await WorkItem.countDocuments({
    projectId: { $in: ids },
    type: "Deliverable",
    reworkCount: { $gt: 0 },
    deletedAt: null,
  });
  const accepted = await WorkItem.countDocuments({
    projectId: { $in: ids },
    type: "Deliverable",
    status: { $in: ["Accepted", "Closed"] },
    deletedAt: null,
  });
  const teamCards = await Scorecard.find({ subjectType: "member" }).sort({ periodEnd: -1 }).limit(8).lean();
  const cardPeople = await User.find({ _id: { $in: teamCards.map((c) => c.subjectId) } }).lean();
  return (
    <div>
      <PageHeader
        title="Team dashboard"
        description="Delivery trends, pending reviews, workload, quality/rework, and team scorecards."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pending reviews</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{pending.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Accepted deliverables</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{accepted}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reworked deliverables</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{rework}</CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workload</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {workload.map((w) => {
              const person = users.find((u) => String(u._id) === String(w._id));
              return (
                <div key={String(w._id)} className="flex justify-between border-b py-2 last:border-0">
                  <span>{person?.name ?? "Unknown"}</span>
                  <span>
                    {w.open} open · {w.overdue} overdue
                  </span>
                </div>
              );
            })}
            {!workload.length ? <p className="text-muted-foreground">No assigned work yet.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pending.map((i) => (
              <div key={String(i._id)}>
                <Link className="hover:underline" href={`/reviews/${i._id}`}>
                  {i.key} {i.title}
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent team scorecards</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {teamCards.map((c) => {
              const subject = cardPeople.find((u) => String(u._id) === String(c.subjectId));
              return (
                <div key={String(c._id)} className="border-b py-2 last:border-0">
                  <Link href={`/scorecards/${c._id}`} className="hover:underline">
                    {subject?.name ?? "Member"} · {c.overallScore ?? "—"} · {c.approvalStatus}
                  </Link>
                </div>
              );
            })}
            {!teamCards.length ? <p className="text-muted-foreground">No team scorecards yet.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
