import Link from "next/link";
import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Scorecard } from "@/models/kpi";
import { User, Team } from "@/models/user";
import { Project } from "@/models/project";
import { generateScorecardForm, generateTeamScorecardForm, generateProjectScorecardForm, refreshKpisForm } from "@/lib/actions/scorecards";
import { canViewIndividualScorecard, hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/fields";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { fmtDate, isoDate } from "@/lib/dates";
import { ROLES } from "@/lib/constants";

export default async function ScorecardsPage() {
  const user = await requireUser();
  await connectDB();
  const people = await User.find({ active: true }).sort({ name: 1 });
  const teams = await Team.find({ active: true }).sort({ name: 1 });
  const projects = await Project.find({ deletedAt: null }).sort({ code: 1 });
  const scorecards = await Scorecard.find({}).sort({ periodEnd: -1 }).limit(50);
  const visible = scorecards.filter((s) => {
    if (s.subjectType !== "member") return hasPermission(user.role, "viewTeamScorecards");
    const subject = people.find((p) => String(p._id) === String(s.subjectId));
    return canViewIndividualScorecard({
      viewerId: user.id,
      viewerRole: user.role,
      subjectId: String(s.subjectId),
      managerId: subject?.managerId ? String(subject.managerId) : null,
    });
  });
  return (
    <>
      <PageHeader title="Scorecards" description="Role-specific KRAs. Ticket counts are operational only (BRULE-11)." />
      <div className="mb-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Refresh calculated KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={refreshKpisForm} className="grid gap-3">
              <Field label="Period start">
                <Input name="periodStart" type="date" defaultValue={isoDate(-90)} />
              </Field>
              <Field label="Period end">
                <Input name="periodEnd" type="date" defaultValue={isoDate()} />
              </Field>
              <SubmitButton>Refresh</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        {hasPermission(user.role, "lockScorecard") ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Generate member scorecard</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm action={generateScorecardForm} className="grid gap-3">
                  <Field label="Member">
                    <Select name="subjectId">
                      {people.map((p) => (
                        <option key={String(p._id)} value={String(p._id)}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Role template">
                    <Select name="role" defaultValue="team_member">
                      {ROLES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Period start">
                    <Input name="periodStart" type="date" defaultValue={isoDate(-90)} />
                  </Field>
                  <Field label="Period end">
                    <Input name="periodEnd" type="date" defaultValue={isoDate()} />
                  </Field>
                  <SubmitButton>Build draft</SubmitButton>
                </ActionForm>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Generate team scorecard</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm action={generateTeamScorecardForm} className="grid gap-3">
                  <Field label="Team">
                    <Select name="subjectId">
                      {teams.map((t) => (
                        <option key={String(t._id)} value={String(t._id)}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Period start">
                    <Input name="periodStart" type="date" defaultValue={isoDate(-90)} />
                  </Field>
                  <Field label="Period end">
                    <Input name="periodEnd" type="date" defaultValue={isoDate()} />
                  </Field>
                  <SubmitButton>Build team draft</SubmitButton>
                </ActionForm>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Generate project scorecard</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm action={generateProjectScorecardForm} className="grid gap-3">
                  <Field label="Project">
                    <Select name="subjectId">
                      {projects.map((p) => (
                        <option key={String(p._id)} value={String(p._id)}>
                          {p.code} {p.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Period start">
                    <Input name="periodStart" type="date" defaultValue={isoDate(-90)} />
                  </Field>
                  <Field label="Period end">
                    <Input name="periodEnd" type="date" defaultValue={isoDate()} />
                  </Field>
                  <SubmitButton>Build project draft</SubmitButton>
                </ActionForm>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Subject</th>
              <th>Role</th>
              <th>Period</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const subject = people.find((p) => String(p._id) === String(s.subjectId));
              const team = teams.find((t) => String(t._id) === String(s.subjectId));
              const project = projects.find((p) => String(p._id) === String(s.subjectId));
              const label =
                s.subjectType === "team"
                  ? (team?.name ?? "Team")
                  : s.subjectType === "project"
                    ? (project ? `${project.code} ${project.name}` : "Project")
                    : (subject?.name ?? String(s.subjectId));
              return (
                <tr key={String(s._id)} className="border-t">
                  <td className="px-4 py-3">
                    <Link className="hover:underline" href={`/scorecards/${s._id}`}>
                      {label}
                    </Link>
                  </td>
                  <td>{s.role}</td>
                  <td className="text-muted-foreground">
                    {fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}
                  </td>
                  <td>{s.overallScore ?? "insufficient"}</td>
                  <td>
                    <Badge tone={s.lockStatus === "locked" ? "green" : "amber"}>{s.approvalStatus}</Badge>
                  </td>
                </tr>
              );
            })}
            {!visible.length ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  No scorecards in this period yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
