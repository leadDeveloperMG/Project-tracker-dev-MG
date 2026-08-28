import Link from "next/link";
import { requireUser } from "@/lib/session";
import { accessibleProjects } from "@/lib/access";
import { hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/app-shell";
import { Badge, RagBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await accessibleProjects(user);
  return (
    <>
      <PageHeader
        title="Projects"
        description="Governed project records created from approved templates."
        actions={
          hasPermission(user.role, "createProject") ? (
            <Link href="/projects/new" className={cn(buttonVariants())}>
              New project
            </Link>
          ) : null
        }
      />
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th>Name</th>
              <th>Status</th>
              <th>RAG</th>
              <th>Unit</th>
              <th>Dates</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={String(p._id)} className="border-t">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/projects/${p._id}`} className="hover:underline">
                    {p.code}
                  </Link>
                </td>
                <td>{p.name}</td>
                <td>
                  <Badge tone="slate">{p.status}</Badge>
                </td>
                <td>
                  <RagBadge value={p.overallRag} />
                </td>
                <td>{p.businessUnit}</td>
                <td className="text-muted-foreground">
                  {fmtDate(p.startDate)} → {fmtDate(p.targetEndDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
