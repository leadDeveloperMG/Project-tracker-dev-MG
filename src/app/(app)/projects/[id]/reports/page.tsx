import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { assertProjectAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { StatusReport } from "@/models/assessment";
import { saveStatusReportFormAction } from "@/lib/actions/projects";
import { PageHeader, ProjectNav } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { RagBadge } from "@/components/ui/badge";
import { fmtDate, isoDate } from "@/lib/dates";
import { ActionForm, SubmitButton } from "@/components/action-form";

export default async function StatusReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  await connectDB();
  const project = await assertProjectAccess(user, id).catch(() => null);
  if (!project) notFound();
  const reports = await StatusReport.find({ projectId: id }).sort({ periodEnd: -1 });
  const action = saveStatusReportFormAction.bind(null, id);
  return (
    <>
      <PageHeader title="Status reports" description="Period updates: accomplishments, plans, blockers, decisions, risks." />
      <ProjectNav id={id} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Submit period update</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={action} className="grid gap-3">
              <Field label="Period start">
                <Input name="periodStart" type="date" defaultValue={isoDate(-7)} required />
              </Field>
              <Field label="Period end">
                <Input name="periodEnd" type="date" defaultValue={isoDate()} required />
              </Field>
              <Field label="Overall health">
                <Select name="overallHealth" defaultValue={project.overallRag}>
                  <option>green</option>
                  <option>amber</option>
                  <option>red</option>
                </Select>
              </Field>
              <Textarea name="accomplishments" placeholder="Accomplishments" />
              <Textarea name="nextPeriodPlans" placeholder="Next-period plans" />
              <Textarea name="blockers" placeholder="Blockers" />
              <Textarea name="decisionsNeeded" placeholder="Decisions needed" />
              <Textarea name="risks" placeholder="Risks" />
              <SubmitButton>Submit report</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {reports.map((r) => (
              <div key={String(r._id)} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span>
                    {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)}
                  </span>
                  <RagBadge value={r.overallHealth} />
                </div>
                <p className="mt-2">{r.accomplishments}</p>
                {r.nextPeriodPlans ? <p className="mt-1 text-muted-foreground">Next: {r.nextPeriodPlans}</p> : null}
                {r.blockers ? <p className="mt-1">Blockers: {r.blockers}</p> : null}
                {r.decisionsNeeded ? <p className="mt-1">Decisions: {r.decisionsNeeded}</p> : null}
                {r.risks ? <p className="mt-1">Risks: {r.risks}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.onTime ? "Submitted on time" : "Late"} · {fmtDate(r.submittedAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
