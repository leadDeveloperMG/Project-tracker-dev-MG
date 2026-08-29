import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { accessibleProjects } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, RagBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/dates";
import { PROJECT_STATUSES } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ rag?: string; status?: string; unit?: string }>;
}) {
  const user = await requirePermission("viewPortfolio");
  const { rag, status, unit } = await searchParams;
  await connectDB();
  let projects = await accessibleProjects(user);
  const units = [...new Set(projects.map((p) => p.businessUnit).filter(Boolean))];
  if (rag) projects = projects.filter((p) => p.overallRag === rag);
  if (status) projects = projects.filter((p) => p.status === status);
  if (unit) projects = projects.filter((p) => p.businessUnit === unit);
  const ids = projects.map((p) => p._id);
  const overdue = await WorkItem.find({
    projectId: { $in: ids },
    deletedAt: null,
    "flags.overdue": true,
    type: { $in: ["Milestone", "Deliverable"] },
  }).limit(8);
  const highRisks = await WorkItem.find({
    projectId: { $in: ids },
    deletedAt: null,
    type: "Risk",
    status: { $nin: ["Closed", "Accepted"] },
  })
    .sort({ exposure: -1 })
    .limit(8);
  const blocked = await WorkItem.find({
    projectId: { $in: ids },
    deletedAt: null,
    $or: [{ blocked: true }, { status: "Blocked" }],
  }).limit(8);

  const byStatus = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});
  const byRag = {
    green: projects.filter((p) => p.overallRag === "green").length,
    amber: projects.filter((p) => p.overallRag === "amber").length,
    red: projects.filter((p) => p.overallRag === "red").length,
  };

  return (
    <>
      <PageHeader title="Portfolio" description="RAG health, delivery exceptions, and strategic view." />
      <form className="mb-6 flex flex-wrap gap-2 text-sm">
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-lg border bg-background px-3">
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select name="rag" defaultValue={rag ?? ""} className="h-9 rounded-lg border bg-background px-3">
          <option value="">All RAG</option>
          <option value="green">Green</option>
          <option value="amber">Amber</option>
          <option value="red">Red</option>
        </select>
        <select name="unit" defaultValue={unit ?? ""} className="h-9 rounded-lg border bg-background px-3">
          <option value="">All units</option>
          {units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
          Apply filters
        </button>
      </form>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Active projects</CardDescription>
            <CardTitle className="text-2xl">{projects.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>RAG mix</CardDescription>
            <CardTitle className="text-2xl">
              {byRag.green}/{byRag.amber}/{byRag.red}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Overdue milestones / deliverables</CardDescription>
            <CardTitle className="text-2xl">{overdue.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Open high risks</CardDescription>
            <CardTitle className="text-2xl">{highRisks.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projects by status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(byStatus).map(([s, n]) => (
              <Badge key={s} tone="blue">
                {s}: {n}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Portfolio list</CardTitle>
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
                  <span className="ml-2 text-muted-foreground">{p.businessUnit}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone="slate">{p.status}</Badge>
                  <RagBadge value={p.overallRag} />
                </span>
              </Link>
            ))}
            {!projects.length ? <p className="text-sm text-muted-foreground">No projects match the filters.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming / overdue</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {overdue.map((i) => (
              <Link key={String(i._id)} href={`/projects/${i.projectId}/work/${i._id}`} className="flex justify-between hover:underline">
                <span>
                  {i.key} {i.title}
                </span>
                <span className="text-muted-foreground">{fmtDate(i.dueDate)}</span>
              </Link>
            ))}
            {!overdue.length ? <p className="text-muted-foreground">No overdue items.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>High risks</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {highRisks.map((i) => (
              <Link key={String(i._id)} href={`/projects/${i.projectId}/work/${i._id}`} className="flex justify-between hover:underline">
                <span>
                  {i.key} {i.title}
                </span>
                <span className="text-muted-foreground">Exposure {i.exposure ?? "—"}</span>
              </Link>
            ))}
            {!highRisks.length ? <p className="text-muted-foreground">No open risks.</p> : null}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Blocked & decisions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {blocked.map((i) => (
              <Link key={String(i._id)} href={`/projects/${i.projectId}/work/${i._id}`} className="hover:underline">
                {i.key} {i.title} — {i.status}
              </Link>
            ))}
            {!blocked.length ? <p className="text-muted-foreground">No blocked work.</p> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
