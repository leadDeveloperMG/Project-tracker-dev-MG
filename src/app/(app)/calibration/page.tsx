import { requirePermission } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Scorecard } from "@/models/kpi";
import { User } from "@/models/user";
import { CalibrationRecord } from "@/models/performance";
import { createCalibrationForm } from "@/lib/actions/scorecards";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { fmtDate, isoDate } from "@/lib/dates";

export default async function CalibrationPage() {
  await requirePermission("calibrate");
  await connectDB();
  const scorecards = await Scorecard.find({ approvalStatus: "approved" });
  const people = await User.find({ active: true });
  const records = await CalibrationRecord.find({}).sort({ createdAt: -1 });
  const dist: Record<string, number> = {};
  for (const s of scorecards) {
    const bucket = s.overallScore == null ? "insufficient" : String(Math.round(s.overallScore));
    dist[bucket] = (dist[bucket] ?? 0) + 1;
  }
  return (
    <>
      <PageHeader title="Calibration" description="Compare rating distributions across teams (FR-084)." />
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        {Object.entries(dist).map(([k, v]) => (
          <Card key={k}>
            <CardHeader>
              <CardDescription>Score {k}</CardDescription>
              <CardTitle>{v}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Approved scorecards</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {scorecards.length === 0 ? <p className="text-muted-foreground">No approved scorecards to compare yet.</p> : null}
          {scorecards.map((s) => {
            const p = people.find((u) => String(u._id) === String(s.subjectId));
            return (
              <div key={String(s._id)} className="flex justify-between">
                <span>{p?.name}</span>
                <span>
                  {s.overallScore ?? "n/a"} · {s.role}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Record calibration decision</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createCalibrationForm} className="grid gap-3">
            <Field label="Period start">
              <Input name="periodStart" type="date" defaultValue={isoDate(-90)} />
            </Field>
            <Field label="Period end">
              <Input name="periodEnd" type="date" defaultValue={isoDate()} />
            </Field>
            <Input name="population" placeholder="Population" />
            <Input name="reviewerGroup" placeholder="Reviewer group" />
            <input type="hidden" name="ratingDistribution" value={JSON.stringify(dist)} />
            <Textarea name="decisions" placeholder="Decisions" />
            <Textarea name="rationale" placeholder="Rationale" />
            <SubmitButton>Save calibration</SubmitButton>
          </ActionForm>
          <div className="mt-6 grid gap-2 text-sm">
            {!records.length ? <p className="text-muted-foreground">No calibration decisions recorded.</p> : null}
            {records.map((r) => (
              <p key={String(r._id)}>
                {fmtDate(r.createdAt)} · {r.population} · {r.decisions}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
