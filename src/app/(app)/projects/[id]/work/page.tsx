import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { assertProjectAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { PageHeader, ProjectNav } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { restoreWorkItemAction } from "@/lib/actions/work-items";
import { WORK_TYPES } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { verbs } from "@/lib/copy";
import { cn } from "@/lib/utils";

export default async function WorkListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; view?: string }>;
}) {
  const { id } = await params;
  const { type, view } = await searchParams;
  const user = await requireUser();
  await connectDB();
  const project = await assertProjectAccess(user, id).catch(() => null);
  if (!project) notFound();
  const archived = view === "archived";
  const items = await WorkItem.find({
    projectId: id,
    deletedAt: archived ? { $ne: null } : null,
    ...(type ? { type } : {}),
  }).sort({ dueDate: 1 });
  return (
    <>
      <PageHeader
        title="Work & deliverables"
        description="Create and track governed work. Archive instead of deleting so history remains auditable."
        actions={
          <Link href={`/projects/${id}/work/new`} className={cn(buttonVariants())}>
            {verbs.create} work item
          </Link>
        }
      />
      <ProjectNav id={id} />
      <div className="mb-4 flex flex-wrap gap-1">
        <Link
          href={`/projects/${id}/work`}
          className={cn(buttonVariants({ variant: !archived && !type ? "default" : "outline", size: "sm" }))}
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
        <Link
          href={`/projects/${id}/work?view=archived`}
          className={cn(buttonVariants({ variant: archived ? "default" : "outline", size: "sm" }))}
        >
          Archived
        </Link>
      </div>
      {!items.length ? (
        <EmptyState
          title={archived ? "No archived work" : type ? `No ${type} items` : "No work items yet"}
          description={
            archived
              ? "Archived items can be restored to the active board."
              : "Create a work item so schedule, health, and reviews have something to measure."
          }
          actionHref={archived ? undefined : `/projects/${id}/work/new`}
          actionLabel={archived ? undefined : `${verbs.create} work item`}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Key</Th>
              <Th>Type</Th>
              <Th>Title</Th>
              <Th>Status</Th>
              <Th>Due</Th>
              <Th>Progress</Th>
              <Th>Flags</Th>
              {archived ? <Th /> : null}
            </tr>
          </THead>
          <tbody>
            {items.map((i) => {
              const restore = restoreWorkItemAction.bind(null, String(i._id));
              return (
                <tr key={String(i._id)} className="border-t">
                  <Td className="font-medium">
                    <Link className="hover:underline" href={`/projects/${id}/work/${i._id}`}>
                      {i.key}
                    </Link>
                  </Td>
                  <Td>{i.type}</Td>
                  <Td>{i.title}</Td>
                  <Td>
                    <Badge tone="slate">{i.status}</Badge>
                  </Td>
                  <Td>{fmtDate(i.dueDate)}</Td>
                  <Td>{i.progress}%</Td>
                  <Td className="space-x-1">
                    {i.flags.overdue ? <Badge tone="red">overdue</Badge> : null}
                    {i.flags.blocked ? <Badge tone="amber">blocked</Badge> : null}
                    {i.flags.unassigned ? <Badge>unassigned</Badge> : null}
                    {i.flags.missingData ? <Badge tone="amber">data</Badge> : null}
                    {i.flags.stale ? <Badge>stale</Badge> : null}
                  </Td>
                  {archived ? (
                    <Td>
                      <form action={restore}>
                        <Button type="submit" size="sm" variant="outline">
                          {verbs.restore}
                        </Button>
                      </form>
                    </Td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
