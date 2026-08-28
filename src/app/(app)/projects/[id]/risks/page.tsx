import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { assertProjectAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { PageHeader, ProjectNav } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

export default async function RisksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  await connectDB();
  const project = await assertProjectAccess(user, id).catch(() => null);
  if (!project) notFound();
  const risks = await WorkItem.find({ projectId: id, type: "Risk", deletedAt: null }).sort({ exposure: -1 });
  const issues = await WorkItem.find({ projectId: id, type: "Issue", deletedAt: null });
  const changes = await WorkItem.find({ projectId: id, type: "Change Request", deletedAt: null });
  return (
    <>
      <PageHeader title="Risks, issues & changes" />
      <ProjectNav id={id} />
      <div className="grid gap-6">
        {[
          ["Risks", risks],
          ["Issues", issues],
          ["Change requests", changes],
        ].map(([title, rows]) => (
          <div key={title as string} className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-4 py-3 font-medium">{title as string}</div>
            <table className="w-full text-sm">
              <tbody>
                {(rows as typeof risks).map((i) => (
                  <tr key={String(i._id)} className="border-t">
                    <td className="px-4 py-2">
                      <Link className="hover:underline" href={`/projects/${id}/work/${i._id}`}>
                        {i.key} {i.title}
                      </Link>
                    </td>
                    <td>
                      <Badge tone="slate">{i.status}</Badge>
                    </td>
                    <td>{i.exposure ? `Exposure ${i.exposure}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
}
