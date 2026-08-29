import Link from "next/link";
import { requireUser } from "@/lib/session";
import { accessibleProjects } from "@/lib/access";
import { hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/app-shell";
import { Badge, RagBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { verbs } from "@/lib/copy";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireUser();
  const { q, status } = await searchParams;
  let projects = await accessibleProjects(user);
  if (q) {
    const needle = q.toLowerCase();
    projects = projects.filter(
      (p) => p.code.toLowerCase().includes(needle) || p.name.toLowerCase().includes(needle),
    );
  }
  if (status) projects = projects.filter((p) => p.status === status);
  const canCreate = hasPermission(user.role, "createProject");
  return (
    <>
      <PageHeader
        title="Projects"
        description="Governed project records created from approved templates. Open a row to edit charter, health, and work."
        actions={
          canCreate ? (
            <Link href="/projects/new" className={cn(buttonVariants())}>
              {verbs.create} project
            </Link>
          ) : null
        }
      />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search code or name"
          className="h-11 min-w-56 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="Search projects"
        />
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
          {verbs.filter}
        </button>
      </form>
      {!projects.length ? (
        <EmptyState
          icon="create"
          title={q || status ? "No projects match these filters" : "No projects yet"}
          description={
            canCreate
              ? "Create a project from an approved template so the team can track work, health, and reviews."
              : "You are not assigned to a project yet. Ask a project manager to add you to the team."
          }
          actionHref={canCreate ? "/projects/new" : undefined}
          actionLabel={canCreate ? `${verbs.create} project` : undefined}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>RAG</Th>
              <Th>Unit</Th>
              <Th>Dates</Th>
            </tr>
          </THead>
          <tbody>
            {projects.map((p) => (
              <tr key={String(p._id)} className="border-t">
                <Td className="font-medium">
                  <Link href={`/projects/${p._id}`} className="hover:underline">
                    {p.code}
                  </Link>
                </Td>
                <Td>{p.name}</Td>
                <Td>
                  <Badge tone="slate">{p.status}</Badge>
                </Td>
                <Td>
                  <RagBadge value={p.overallRag} />
                </Td>
                <Td>{p.businessUnit}</Td>
                <Td className="text-muted-foreground">
                  {fmtDate(p.startDate)} → {fmtDate(p.targetEndDate)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
