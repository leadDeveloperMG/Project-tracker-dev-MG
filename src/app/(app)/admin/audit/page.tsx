import { requirePermission } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/audit";
import { User } from "@/models/user";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/dates";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; action?: string }>;
}) {
  await requirePermission("manageUsers");
  const { entityType, action } = await searchParams;
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (entityType) filter.entityType = entityType;
  if (action) filter.action = new RegExp(action, "i");
  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(200);
  const actors = await User.find({ _id: { $in: logs.map((l) => l.actorId).filter(Boolean) } }).select("name email");
  const nameOf = (id?: unknown) => actors.find((a) => String(a._id) === String(id))?.name ?? "system";
  const types = [...new Set(logs.map((l) => l.entityType))];

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Append-only record of user, project, workflow, health, KPI, and approval changes."
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <a className="rounded-lg border px-3 py-1.5 hover:bg-muted" href="/admin/audit?action=kpi.override">
          KPI overrides
        </a>
        <a className="rounded-lg border px-3 py-1.5 hover:bg-muted" href="/admin/audit?action=health.override">
          Health overrides
        </a>
        <a className="rounded-lg border px-3 py-1.5 hover:bg-muted" href="/admin/audit?action=scorecard">
          Scorecards
        </a>
        <a className="rounded-lg border px-3 py-1.5 hover:bg-muted" href="/admin/audit?action=assessment">
          Assessments
        </a>
      </div>
      <form className="mb-4 flex flex-wrap gap-2 text-sm">
        <select name="entityType" defaultValue={entityType ?? ""} className="h-9 rounded-lg border bg-background px-3">
          <option value="">All entities</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          name="action"
          defaultValue={action ?? ""}
          placeholder="Action contains…"
          className="h-9 rounded-lg border bg-background px-3"
        />
        <button type="submit" className="h-9 rounded-lg border px-3">
          Filter
        </button>
      </form>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={String(log._id)} className="border-t align-top">
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                <td>{nameOf(log.actorId)}</td>
                <td>
                  <Badge tone="slate">{log.action}</Badge>
                </td>
                <td>
                  {log.entityType} · {log.entityId}
                </td>
                <td className="max-w-sm text-muted-foreground">{log.reason ?? "—"}</td>
              </tr>
            ))}
            {!logs.length ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  No audit entries match this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
