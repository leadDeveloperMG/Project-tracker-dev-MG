import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { AnnualReview } from "@/models/performance";
import { Scorecard } from "@/models/kpi";
import { User } from "@/models/user";
import { saveAnnualReviewForm } from "@/lib/actions/scorecards";
import { canViewIndividualScorecard, hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { fmtDate } from "@/lib/dates";

export default async function AnnualReviewsPage() {
  const user = await requireUser();
  await connectDB();
  const people = await User.find({ active: true });
  const reviews = await AnnualReview.find({}).sort({ year: -1 });
  const yearCards = await Scorecard.find({
    subjectType: "member",
    approvalStatus: "approved",
  }).sort({ periodEnd: -1 });
  const reviewYear = new Date().getFullYear();
  const visible = reviews.filter((r) =>
    canViewIndividualScorecard({
      viewerId: user.id,
      viewerRole: user.role,
      subjectId: String(r.memberId),
      managerId: people.find((p) => String(p._id) === String(r.memberId))?.managerId
        ? String(people.find((p) => String(p._id) === String(r.memberId))?.managerId)
        : null,
    }),
  );
  return (
    <>
      <PageHeader
        title="Annual performance reviews"
        description="Consolidates validated periods. Metrics never auto-finalize a rating (FR-087)."
      />
      {hasPermission(user.role, "lockScorecard") ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create / update record</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={saveAnnualReviewForm} className="grid gap-3 md:grid-cols-2">
              <Field label="Member">
                <Select name="memberId">
                  {people.map((p) => (
                    <option key={String(p._id)} value={String(p._id)}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Year">
                <Input name="year" type="number" defaultValue={reviewYear} />
              </Field>
              <Field label="Consolidated score (manual)">
                <Input name="consolidatedScore" type="number" step="0.1" />
              </Field>
              <Field label="Status">
                <Select name="approvalStatus" defaultValue="draft">
                  <option>draft</option>
                  <option>pending</option>
                  <option>approved</option>
                </Select>
              </Field>
              <Textarea name="managerComments" placeholder="Manager comments" className="md:col-span-2" />
              <Textarea name="qualitativeEvidence" placeholder="Qualitative evidence" className="md:col-span-2" />
              <Textarea name="developmentOutcomes" placeholder="Development outcomes" className="md:col-span-2" />
              <Textarea name="futureGoals" placeholder="Future goals" className="md:col-span-2" />
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-3">
        {!visible.length ? (
          <p className="text-sm text-muted-foreground">No annual review records yet. Metrics never auto-finalize a rating.</p>
        ) : null}
        {visible.map((r) => {
          const p = people.find((u) => String(u._id) === String(r.memberId));
          const periods = yearCards.filter(
            (c) => String(c.subjectId) === String(r.memberId) && new Date(c.periodEnd).getFullYear() === r.year,
          );
          return (
            <Card key={String(r._id)}>
              <CardContent className="pt-5 text-sm">
                <p className="font-medium">
                  {p?.name} · {r.year} · {r.approvalStatus} · {r.consolidatedScore ?? "pending manager review"}
                </p>
                <p className="text-muted-foreground">
                  Validated periods:{" "}
                  {periods.length
                    ? periods.map((c) => `${fmtDate(c.periodEnd)} (${c.overallScore ?? "n/a"})`).join(" · ")
                    : "none yet — this record is not an auto-final rating"}
                </p>
                <p>{r.managerComments}</p>
                <p className="text-muted-foreground">{r.futureGoals}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
