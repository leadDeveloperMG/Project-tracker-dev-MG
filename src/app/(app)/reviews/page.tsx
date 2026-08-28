import Link from "next/link";
import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { accessibleProjects } from "@/lib/access";
import { WorkItem } from "@/models/work-item";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { hasPermission } from "@/lib/rbac";

export default async function ReviewsPage() {
  const user = await requireUser();
  await connectDB();
  const projects = await accessibleProjects(user);
  const items = await WorkItem.find({
    projectId: { $in: projects.map((p) => p._id) },
    type: "Deliverable",
    status: { $in: ["Ready for Review", "Rework Required", "In Progress", "Accepted"] },
    deletedAt: null,
  }).sort({ updatedAt: -1 });
  return (
    <>
      <PageHeader
        title="Deliverable reviews"
        description="Assess quality dimensions before acceptance. Owners cannot accept their own work."
      />
      {!hasPermission(user.role, "assessDeliverable") ? (
        <p className="mb-4 text-sm text-muted-foreground">You can view the queue; only reviewers and leads can submit scores.</p>
      ) : null}
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th>Title</th>
              <th>Status</th>
              <th>Project</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={String(i._id)} className="border-t">
                <td className="px-4 py-3">
                  <Link className="font-medium hover:underline" href={`/reviews/${i._id}`}>
                    {i.key}
                  </Link>
                </td>
                <td>{i.title}</td>
                <td>
                  <Badge tone="slate">{i.status}</Badge>
                </td>
                <td>
                  <Link className="hover:underline" href={`/projects/${i.projectId}/work/${i._id}`}>
                    Open work item
                  </Link>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                  No deliverables waiting for review.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
