import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { assertProjectAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { PageHeader, ProjectNav } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WORK_TYPES } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";

export default async function WorkListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type } = await searchParams;
  const user = await requireUser();
  await connectDB();
  const project = await assertProjectAccess(user, id).catch(() => null);
  if (!project) notFound();
  const items = await WorkItem.find({
    projectId: id,
    deletedAt: null,
    ...(type ? { type } : {}),
  }).sort({ dueDate: 1 });
  return (
    <>
      <PageHeader
        title="Work & deliverables"
        actions={
          <Link href={`/projects/${id}/work/new`} className={cn(buttonVariants())}>
            New work item
          </Link>
        }
      />
      <ProjectNav id={id} />
      <div className="mb-4 flex flex-wrap gap-1">
        <Link
          href={`/projects/${id}/work`}
          className={cn(buttonVariants({ variant: type ? "outline" : "default", size: "sm" }))}
        >
          All
        </Link>
        {WORK_TYPES.map((t) => (
          <Link
            key={t}
            href={`/projects/${id}/work?type=${encodeURIComponent(t)}`}
            className={cn(buttonVariants({ variant: type === t ? "default" : "outline", size: "sm" }))}
          >
            {t}
          </Link>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th>Type</th>
              <th>Title</th>
              <th>Status</th>
              <th>Due</th>
              <th>Progress</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={String(i._id)} className="border-t">
                <td className="px-4 py-3">
                  <Link className="font-medium hover:underline" href={`/projects/${id}/work/${i._id}`}>
                    {i.key}
                  </Link>
                </td>
                <td>{i.type}</td>
                <td>{i.title}</td>
                <td>
                  <Badge tone="slate">{i.status}</Badge>
                </td>
                <td>{fmtDate(i.dueDate)}</td>
                <td>{i.progress}%</td>
                <td className="space-x-1">
                  {i.flags.overdue ? <Badge tone="red">overdue</Badge> : null}
                  {i.flags.blocked ? <Badge tone="amber">blocked</Badge> : null}
                  {i.flags.unassigned ? <Badge>unassigned</Badge> : null}
                  {i.flags.missingData ? <Badge tone="amber">data</Badge> : null}
                  {i.flags.stale ? <Badge>stale</Badge> : null}
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                  No work items{type ? ` of type ${type}` : ""}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
