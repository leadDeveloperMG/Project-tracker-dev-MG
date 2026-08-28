import { requirePermission } from "@/lib/session";
import { accessibleProjects } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { ScheduledReport } from "@/models/performance";
import { scheduleReportForm } from "@/lib/actions/admin";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/fields";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RagBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/dates";
import { hasPermission } from "@/lib/rbac";

export default async function ReportsPage() {
  const user = await requirePermission("viewPortfolio");
  await connectDB();
  const projects = await accessibleProjects(user);
  const people = await User.find({ active: true });
  const scheduled = await ScheduledReport.find({}).sort({ createdAt: -1 });
  return (
    <>
      <PageHeader title="Executive reports" description="Filterable portfolio, delivery, risk, and authorized KPI summaries." />
      <div className="mb-4 flex flex-wrap gap-2">
        <a className={cn(buttonVariants({ variant: "outline" }))} href="/api/export/csv?type=portfolio">
          Export CSV
        </a>
        <a className={cn(buttonVariants({ variant: "outline" }))} href="/api/export/pdf?type=portfolio" target="_blank">
          Print / PDF
        </a>
      </div>
      <div className="mb-6 overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th>Unit</th>
              <th>Status</th>
              <th>RAG</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={String(p._id)} className="border-t">
                <td className="px-4 py-3">
                  {p.code} {p.name}
                </td>
                <td>{p.businessUnit}</td>
                <td>{p.status}</td>
                <td>
                  <RagBadge value={p.overallRag} />
                </td>
                <td>{fmtDate(p.targetEndDate)}</td>
              </tr>
            ))}
            {!projects.length ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  No projects in this view.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {hasPermission(user.role, "scheduleReports") ? (
      <Card>
        <CardHeader>
          <CardTitle>Schedule distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={scheduleReportForm} className="grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <Input name="name" defaultValue="Weekly portfolio" />
            </Field>
            <Field label="Type">
              <Select name="reportType">
                <option value="portfolio">Portfolio</option>
                <option value="risks">Risks</option>
                <option value="scorecards">Authorized scorecards</option>
              </Select>
            </Field>
            <Field label="Cadence">
              <Select name="cadence">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </Field>
            <Field label="Recipients" className="md:col-span-2">
              <div className="grid max-h-36 gap-1 overflow-auto rounded-lg border p-2 text-sm">
                {people.map((p) => (
                  <label key={String(p._id)} className="flex items-center gap-2">
                    <input type="checkbox" name="recipientIds" value={String(p._id)} />
                    {p.name}
                  </label>
                ))}
              </div>
            </Field>
            <SubmitButton>Schedule</SubmitButton>
          </ActionForm>
          <ul className="mt-4 text-sm">
            {!scheduled.length ? <li className="text-muted-foreground">No scheduled distributions yet.</li> : null}
            {scheduled.map((s) => (
              <li key={String(s._id)}>
                {s.name} · {s.cadence} · {s.active ? "active" : "off"}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      ) : null}
    </>
  );
}
