import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { assertProjectAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { Assessment } from "@/models/assessment";
import { PageHeader, ProjectNav } from "@/components/app-shell";

export default async function QualityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  await connectDB();
  const project = await assertProjectAccess(user, id).catch(() => null);
  if (!project) notFound();
  const deliverables = await WorkItem.find({ projectId: id, type: "Deliverable", deletedAt: null });
  const assessments = await Assessment.find({ projectId: id }).sort({ createdAt: -1 }).limit(20);
  const reviewed = deliverables.filter((d) => d.reviewed);
  const firstPass = reviewed.filter((d) => d.firstPassAccepted && d.reworkCount === 0).length;
  const rework = reviewed.filter((d) => d.reworkCount > 0).length;
  return (
    <>
      <PageHeader title="Quality & data quality" />
      <ProjectNav id={id} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">First-pass acceptance</p>
          <p className="text-2xl font-semibold">
            {reviewed.length ? Math.round((firstPass / reviewed.length) * 100) : 0}%
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Rework rate</p>
          <p className="text-2xl font-semibold">
            {reviewed.length ? Math.round((rework / reviewed.length) * 100) : 0}%
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Missing owner/date/criteria</p>
          <p className="text-2xl font-semibold">{deliverables.filter((d) => d.flags.missingData).length}</p>
        </div>
      </div>
      <div className="grid gap-2 text-sm">
        {assessments.map((a) => (
          <Link key={String(a._id)} href={`/reviews/${a.deliverableId}`} className="rounded-lg border bg-card px-4 py-2 hover:bg-muted">
            Assessment score {a.overallScore}
          </Link>
        ))}
      </div>
    </>
  );
}
