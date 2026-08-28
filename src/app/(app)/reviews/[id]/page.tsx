import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { Assessment } from "@/models/assessment";
import { assertProjectAccess } from "@/lib/access";
import { submitAssessmentForm } from "@/lib/actions/assessments";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { ASSESSMENT_DIMENSIONS } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  await connectDB();
  const item = await WorkItem.findById(id);
  if (!item) notFound();
  await assertProjectAccess(user, String(item.projectId));
  const history = await Assessment.find({ deliverableId: id }).sort({ createdAt: -1 });
  const action = submitAssessmentForm.bind(null, id);
  return (
    <>
      <PageHeader
        title={`Assess ${item.key}`}
        description={`${item.title} · ${item.status}. Weighted score across six default dimensions (FR-040–046).`}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deliverable scorecard</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={action} className="grid gap-4">
              {ASSESSMENT_DIMENSIONS.map((d) => (
                <div key={d.key} className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-medium">
                    {d.label} ({d.weight}%)
                  </p>
                  <Field label="Score 1–5">
                    <Input name={`score_${d.key}`} type="number" min={1} max={5} defaultValue={3} />
                  </Field>
                  <Textarea name={`comment_${d.key}`} placeholder="Dimension comments" className="mt-2" />
                  <Input name={`evidence_${d.key}`} placeholder="Evidence URL (optional)" className="mt-2" />
                </div>
              ))}
              <Field label="Overall comments">
                <Textarea name="comments" />
              </Field>
              <Field label="Evidence URL">
                <Input name="evidenceUrl" />
              </Field>
              <Field label="Outcome">
                <Select name="outcome" defaultValue="record">
                  <option value="record">Record assessment only</option>
                  <option value="accept">Accept deliverable</option>
                  <option value="rework">Request rework</option>
                  <option value="reject">Reject</option>
                </Select>
              </Field>
              <Field label="Corrective actions (required for rework)">
                <Textarea name="reworkActions" />
              </Field>
              <Field label="Revised due date">
                <Input name="revisedDueDate" type="date" />
              </Field>
              <SubmitButton>Save assessment</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assessment history</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {history.length === 0 ? <p className="text-muted-foreground">No prior assessments.</p> : null}
            {history.map((h) => (
              <div key={String(h._id)} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Weighted score {h.overallScore.toFixed(2)}</p>
                  <Badge tone="slate">{fmtDate(h.reviewDate)}</Badge>
                </div>
                <p className="mt-1">{h.comments}</p>
                {h.reworkActions ? <p className="text-amber-800">Rework: {h.reworkActions}</p> : null}
                <ul className="mt-2 text-muted-foreground">
                  {h.dimensions.map((d: { key: string; label: string; score: number; weight: number }) => (
                    <li key={d.key}>
                      {d.label}: {d.score}/5 ({d.weight}%)
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
