import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { CheckIn } from "@/models/performance";
import { User } from "@/models/user";
import { createCheckInForm } from "@/lib/actions/scorecards";
import { canViewIndividualScorecard, hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { fmtDate, isoDate } from "@/lib/dates";

export default async function CheckInsPage() {
  const user = await requireUser();
  await connectDB();
  const people = await User.find({ active: true }).sort({ name: 1 });
  const items = await CheckIn.find({}).sort({ date: -1 }).limit(80);
  const visible = items.filter((c) => {
    const member = people.find((p) => String(p._id) === String(c.memberId));
    return canViewIndividualScorecard({
      viewerId: user.id,
      viewerRole: user.role,
      subjectId: String(c.memberId),
      managerId: member?.managerId ? String(member.managerId) : null,
    });
  });
  return (
    <>
      <PageHeader
        title="Monthly check-ins"
        description="Progress, feedback, constraints, and development actions. Records follow the same access rules as individual scorecards."
      />
      {hasPermission(user.role, "lockScorecard") ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New check-in</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={createCheckInForm} className="grid gap-3 md:grid-cols-2">
              <Field label="Member">
                <Select name="memberId">
                  {people.map((p) => (
                    <option key={String(p._id)} value={String(p._id)}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date">
                <Input name="date" type="date" defaultValue={isoDate()} />
              </Field>
              <Textarea name="progressNotes" placeholder="Progress" className="md:col-span-2" />
              <Textarea name="feedback" placeholder="Feedback" className="md:col-span-2" />
              <Textarea name="constraints" placeholder="Constraints" className="md:col-span-2" />
              <Textarea name="developmentActions" placeholder="Development actions" className="md:col-span-2" />
              <Field label="Follow-up">
                <Input name="followUpDate" type="date" />
              </Field>
              <SubmitButton>Save check-in</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-3">
        {!visible.length ? (
          <p className="text-sm text-muted-foreground">No check-ins you are authorized to view.</p>
        ) : null}
        {visible.map((c) => {
          const member = people.find((p) => String(p._id) === String(c.memberId));
          return (
            <Card key={String(c._id)}>
              <CardContent className="pt-5 text-sm">
                <p className="font-medium">
                  {member?.name} · {fmtDate(c.date)}
                </p>
                <p>{c.progressNotes}</p>
                <p className="text-muted-foreground">{c.feedback}</p>
                {c.constraints ? <p>Constraints: {c.constraints}</p> : null}
                {c.developmentActions ? <p>Development: {c.developmentActions}</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
