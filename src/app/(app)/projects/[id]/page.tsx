import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { assertProjectAccess, canManageProject } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { User } from "@/models/user";
import { AuditLog } from "@/models/audit";
import { updateProjectFormAction, recalcHealthAction } from "@/lib/actions/projects";
import { PageHeader, ProjectNav } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, RagBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { HEALTH_DIMENSIONS, PROJECT_STATUSES } from "@/lib/constants";
import { fmtDate, fmtDateInput } from "@/lib/dates";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActionForm, SubmitButton } from "@/components/action-form";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  await connectDB();
  const project = await assertProjectAccess(user, id).catch(() => null);
  if (!project) notFound();
  const users = await User.find({ active: true }).sort({ name: 1 });
  const counts = await WorkItem.aggregate([
    { $match: { projectId: project._id, deletedAt: null } },
    { $group: { _id: "$type", n: { $sum: 1 } } },
  ]);
  const quality = await WorkItem.find({
    projectId: project._id,
    deletedAt: null,
    $or: [
      { "flags.missingData": true },
      { "flags.unassigned": true },
      { "flags.stale": true },
      { "flags.overdue": true },
    ],
  }).limit(12);
  const activity = await AuditLog.find({ entityId: id }).sort({ createdAt: -1 }).limit(8);
  const manage = canManageProject(user, project);
  const recalc = recalcHealthAction.bind(null, id);
  const update = updateProjectFormAction.bind(null, id);
  const selected = (ids: unknown[] | undefined, uid: string) =>
    (ids ?? []).some((value) => String(value) === uid);

  return (
    <>
      <PageHeader
        title={`${project.code} · ${project.name}`}
        description={project.strategicObjective}
        actions={
          <form action={recalc}>
            <Button type="submit" variant="outline">
              Recalculate health
            </Button>
          </form>
        }
      />
      <ProjectNav id={id} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="slate">{project.status}</Badge>
        <RagBadge value={project.overallRag} />
        <Badge>{project.businessUnit}</Badge>
        <span className="text-sm text-muted-foreground">
          {fmtDate(project.startDate)} → {fmtDate(project.targetEndDate)}
        </span>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {HEALTH_DIMENSIONS.map((dim) => (
          <Card key={dim}>
            <CardHeader className="p-3">
              <CardDescription className="capitalize">{dim}</CardDescription>
              <RagBadge value={project.health?.[dim]?.rag} />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Work mix</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {counts.map((c) => (
              <Badge key={c._id} tone="blue">
                {c._id}: {c.n}
              </Badge>
            ))}
            <Link href={`/projects/${id}/work`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Open work
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data quality</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            {quality.map((i) => (
              <Link key={String(i._id)} href={`/projects/${id}/work/${i._id}`} className="hover:underline">
                {i.key} {i.title}
                {i.flags.overdue ? " · overdue" : ""}
                {i.flags.unassigned ? " · unassigned" : ""}
                {i.flags.missingData ? " · missing data" : ""}
              </Link>
            ))}
            {!quality.length ? <p className="text-muted-foreground">No data-quality flags.</p> : null}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Charter & controls</CardTitle>
          </CardHeader>
          <CardContent>
            {manage ? (
            <ActionForm action={update} className="grid gap-3 md:grid-cols-2">
              <Field label="Name">
                <Input name="name" defaultValue={project.name} />
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={project.status}>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Sponsor">
                <Select name="sponsorId" defaultValue={project.sponsorId ? String(project.sponsorId) : ""}>
                  <option value="">Select</option>
                  {users.map((u) => (
                    <option key={String(u._id)} value={String(u._id)}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Manager">
                <Select name="managerId" defaultValue={project.managerId ? String(project.managerId) : ""}>
                  <option value="">Select</option>
                  {users.map((u) => (
                    <option key={String(u._id)} value={String(u._id)}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Team lead">
                <Select name="teamLeadId" defaultValue={project.teamLeadId ? String(project.teamLeadId) : ""}>
                  <option value="">Select</option>
                  {users.map((u) => (
                    <option key={String(u._id)} value={String(u._id)}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Business unit">
                <Input name="businessUnit" defaultValue={project.businessUnit} />
              </Field>
              <Field label="Start">
                <Input name="startDate" type="date" defaultValue={fmtDateInput(project.startDate)} />
              </Field>
              <Field label="Target end">
                <Input name="targetEndDate" type="date" defaultValue={fmtDateInput(project.targetEndDate)} />
              </Field>
              <Field label="Strategic objective" className="md:col-span-2">
                <Input name="strategicObjective" defaultValue={project.strategicObjective} />
              </Field>
              <Field label="Charter" className="md:col-span-2">
                <Textarea name="charter" defaultValue={project.charter} />
              </Field>
              <Field label="Scope baseline" className="md:col-span-2">
                <Textarea name="scopeBaseline" defaultValue={project.scopeBaseline} />
              </Field>
              <Field label="Period / project-start goals" className="md:col-span-2">
                <Textarea name="periodGoals" defaultValue={project.periodGoals} />
              </Field>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" name="confirmGoals" defaultChecked={Boolean(project.goalsConfirmedAt)} />
                Goals confirmed with the team
                {project.goalsConfirmedAt ? (
                  <span className="text-muted-foreground">({fmtDate(project.goalsConfirmedAt)})</span>
                ) : null}
              </label>
              <Field label="Team members" className="md:col-span-2">
                <div className="grid max-h-36 grid-cols-2 gap-1 overflow-auto rounded-lg border p-2 text-sm">
                  {users.map((u) => (
                    <label key={String(u._id)} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="teamMemberIds"
                        value={String(u._id)}
                        defaultChecked={selected(project.teamMemberIds, String(u._id))}
                      />
                      {u.name}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Stakeholders">
                <div className="grid max-h-28 gap-1 overflow-auto rounded-lg border p-2 text-sm">
                  {users.map((u) => (
                    <label key={String(u._id)} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="stakeholderIds"
                        value={String(u._id)}
                        defaultChecked={selected(project.stakeholderIds, String(u._id))}
                      />
                      {u.name}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Approvers">
                <div className="grid max-h-28 gap-1 overflow-auto rounded-lg border p-2 text-sm">
                  {users.map((u) => (
                    <label key={String(u._id)} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="approverIds"
                        value={String(u._id)}
                        defaultChecked={selected(project.approverIds, String(u._id))}
                      />
                      {u.name}
                    </label>
                  ))}
                </div>
              </Field>
              <p className="text-xs text-muted-foreground md:col-span-2">
                Moving to In Progress requires manager, sponsor, dates, and at least one milestone.
              </p>
              <SubmitButton>Save project</SubmitButton>
            </ActionForm>
            ) : (
              <div className="grid gap-3 text-sm">
                <p>{project.charter || "No charter recorded."}</p>
                <p className="text-muted-foreground">{project.scopeBaseline}</p>
                {project.periodGoals ? (
                  <p>
                    Period goals: {project.periodGoals}
                    {project.goalsConfirmedAt ? ` · confirmed ${fmtDate(project.goalsConfirmedAt)}` : " · not yet confirmed"}
                  </p>
                ) : null}
                <p className="text-muted-foreground">
                  You can view this project. Only the manager, team lead, or PMO can change charter controls.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {activity.map((a) => (
              <div key={String(a._id)} className="flex justify-between">
                <span>
                  {a.action} · {a.entityType}
                </span>
                <span className="text-muted-foreground">{fmtDate(a.createdAt)}</span>
              </div>
            ))}
            {!activity.length ? <p className="text-muted-foreground">No audit entries yet.</p> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
