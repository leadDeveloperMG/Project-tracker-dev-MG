import { requirePermission } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { Project } from "@/models/project";
import { StatusReport } from "@/models/assessment";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";

const FLAG_KEYS = ["overdue", "stale", "unassigned", "missingData", "blocked"] as const;

export default async function DataQualityAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ flag?: string }>;
}) {
  await requirePermission("viewDataQuality");
  const { flag } = await searchParams;
  await connectDB();
  const items = await WorkItem.find({
    deletedAt: null,
    $or: [
      { "flags.missingData": true },
      { "flags.unassigned": true },
      { "flags.stale": true },
      { "flags.overdue": true },
      { "flags.blocked": true },
    ],
  })
    .sort({ updatedAt: 1 })
    .limit(200)
    .lean();
  const projects = await Project.find({ deletedAt: null }).lean();
  const map = Object.fromEntries(projects.map((p) => [String(p._id), p.code]));
  const counts = {
    overdue: items.filter((i) => i.flags?.overdue).length,
    stale: items.filter((i) => i.flags?.stale).length,
    unassigned: items.filter((i) => i.flags?.unassigned).length,
    missingData: items.filter((i) => i.flags?.missingData).length,
    blocked: items.filter((i) => i.flags?.blocked).length,
  };
  const filtered =
    flag && FLAG_KEYS.includes(flag as (typeof FLAG_KEYS)[number])
      ? items.filter((i) => Boolean((i.flags as Record<string, boolean> | undefined)?.[flag]))
      : items;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 8);
  const lateReports = [];
  for (const project of projects) {
    const latest = await StatusReport.findOne({ projectId: project._id }).sort({ periodEnd: -1 }).lean();
    if (!latest || (latest.submittedAt && new Date(latest.submittedAt) < cutoff) || !latest.onTime) {
      lateReports.push({
        code: project.code,
        id: String(project._id),
        last: latest?.submittedAt ?? null,
        onTime: latest?.onTime ?? false,
      });
    }
  }
  return (
    <div>
      <PageHeader
        title="Portfolio data quality"
        description="Hourly cron refreshes overdue, stale (7 days without update), unassigned, and missing-data flags. Status reports are expected within one day of period end."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-5">
        {FLAG_KEYS.map((key) => (
          <Link
            key={key}
            href={flag === key ? "/admin/data-quality" : `/admin/data-quality?flag=${key}`}
            className={`rounded-xl border p-4 ${flag === key ? "border-primary bg-muted/60" : "bg-white"}`}
          >
            <p className="text-sm capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</p>
            <p className="text-2xl font-semibold">{counts[key]}</p>
          </Link>
        ))}
      </div>
      <div className="mb-6 rounded-xl border bg-white p-4 text-sm">
        <p className="font-medium">Reminder SLAs</p>
        <ul className="mt-2 list-disc pl-5 text-muted-foreground">
          <li>Overdue and blocked items: hourly in-app + email to assignee and project manager</li>
          <li>Ready for review: hourly to the designated approver</li>
          <li>Open scorecards and red KPIs: hourly to the reviewer/approver</li>
          <li>Scheduled portfolio packs: weekdays 08:00 UTC to selected recipients</li>
        </ul>
      </div>
      {lateReports.length ? (
        <div className="mb-6 rounded-xl border bg-white p-4 text-sm">
          <p className="mb-2 font-medium">Status reports needing attention</p>
          {lateReports.map((r) => (
            <p key={r.id}>
              <Link className="hover:underline" href={`/projects/${r.id}/reports`}>
                {r.code}
              </Link>{" "}
              · {r.last ? `last submitted ${new Date(r.last).toISOString().slice(0, 10)}` : "none submitted"}
              {r.onTime === false ? " · late" : ""}
            </p>
          ))}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-3 py-2">Project</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={String(i._id)} className="border-t">
                <td className="px-3 py-2">{map[String(i.projectId)]}</td>
                <td className="px-3 py-2">
                  <Link href={`/projects/${i.projectId}/work/${i._id}`}>
                    {i.key} {i.title}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {Object.entries(i.flags || {})
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .join(", ")}
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={3}>
                  No flagged work items.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
