import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { assertProjectAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { Assessment } from "@/models/assessment";
import { User } from "@/models/user";
import { AuditLog } from "@/models/audit";
import {
  addCommentAction,
  addLinkAction,
  archiveWorkItemAction,
  attachEvidenceAction,
  transitionWorkItemFormAction,
  updateWorkItemFormAction,
  uploadEvidenceFileAction,
} from "@/lib/actions/work-items";
import { allowedTransitions } from "@/lib/engines/workflow";
import { PageHeader, ProjectNav } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { LINK_TYPES, PRIORITIES } from "@/lib/constants";
import { fmtDate, fmtDateInput } from "@/lib/dates";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { UploadEvidenceForm } from "@/components/phase1-forms";

export default async function WorkItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const user = await requireUser();
  await connectDB();
  const project = await assertProjectAccess(user, id).catch(() => null);
  if (!project) notFound();
  const item = await WorkItem.findById(itemId);
  if (!item || String(item.projectId) !== id) notFound();
  const users = await User.find({ active: true });
  const others = await WorkItem.find({ projectId: id, _id: { $ne: item._id }, deletedAt: null }).select("key title");
  const assessments = await Assessment.find({ deliverableId: itemId }).sort({ createdAt: -1 });
  const history = await AuditLog.find({ entityType: "WorkItem", entityId: itemId }).sort({ createdAt: -1 }).limit(12);
  const next = allowedTransitions(item.type, item.status);
  const update = updateWorkItemFormAction.bind(null, itemId);
  const transition = transitionWorkItemFormAction.bind(null, itemId);
  const comment = addCommentAction.bind(null, itemId);
  const link = addLinkAction.bind(null, itemId);
  const attach = attachEvidenceAction.bind(null, itemId);
  const upload = uploadEvidenceFileAction.bind(null, itemId);
  const archive = archiveWorkItemAction.bind(null, itemId);
  const userName = (uid?: unknown) => users.find((u) => String(u._id) === String(uid))?.name ?? "—";
  const linkTarget = (tid: unknown) => others.find((o) => String(o._id) === String(tid));

  return (
    <>
      <PageHeader
        title={`${item.key} · ${item.title}`}
        description={item.type}
        actions={
          <form action={archive}>
            <Button type="submit" variant="destructive" size="sm">
              Archive
            </Button>
          </form>
        }
      />
      <ProjectNav id={id} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="slate">{item.status}</Badge>
        <Badge>{item.priority}</Badge>
        {item.flags.overdue ? <Badge tone="red">overdue</Badge> : null}
        {item.flags.blocked ? <Badge tone="amber">blocked</Badge> : null}
        {item.flags.missingData ? <Badge tone="amber">missing data</Badge> : null}
        <span className="text-sm text-muted-foreground">Progress {item.progress}%</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={update} className="grid gap-3 md:grid-cols-2">
              <Field label="Title" className="md:col-span-2">
                <Input name="title" defaultValue={item.title} />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <Textarea name="description" defaultValue={item.description} />
              </Field>
              <Field label="Assignee">
                <Select name="assigneeId" defaultValue={item.assigneeId ? String(item.assigneeId) : ""}>
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={String(u._id)} value={String(u._id)}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Approver">
                <Select name="approverId" defaultValue={item.approverId ? String(item.approverId) : ""}>
                  <option value="">None</option>
                  {users.map((u) => (
                    <option key={String(u._id)} value={String(u._id)}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Priority">
                <Select name="priority" defaultValue={item.priority}>
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Progress mode">
                <Select name="progressMode" defaultValue={item.progressMode}>
                  <option value="child-item">Child items</option>
                  <option value="weighted-completion">Weighted</option>
                  <option value="manual">Manual</option>
                </Select>
              </Field>
              <Field label="Manual progress">
                <Input name="progress" type="number" defaultValue={item.progress} />
              </Field>
              <Field label="Due">
                <Input name="dueDate" type="date" defaultValue={fmtDateInput(item.dueDate)} />
              </Field>
              <Field label="Planned">
                <Input name="plannedDate" type="date" defaultValue={fmtDateInput(item.plannedDate)} />
              </Field>
              <Field label="Baseline">
                <Input name="baselineDate" type="date" defaultValue={fmtDateInput(item.baselineDate)} />
              </Field>
              <Field label="Forecast">
                <Input name="forecastDate" type="date" defaultValue={fmtDateInput(item.forecastDate)} />
              </Field>
              <Field label="Actual">
                <Input name="actualDate" type="date" defaultValue={fmtDateInput(item.actualDate)} />
              </Field>
              <Field label="Acceptance criteria" className="md:col-span-2">
                <Textarea name="acceptanceCriteria" defaultValue={item.acceptanceCriteria} />
              </Field>
              {item.type === "Risk" ? (
                <>
                  <Field label="Likelihood">
                    <Input name="likelihood" type="number" defaultValue={item.likelihood ?? ""} />
                  </Field>
                  <Field label="Impact">
                    <Input name="impact" type="number" defaultValue={item.impact ?? ""} />
                  </Field>
                  <Field label="Mitigation" className="md:col-span-2">
                    <Textarea name="mitigation" defaultValue={item.mitigation ?? ""} />
                  </Field>
                </>
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="committed" defaultChecked={item.committed} /> Committed
              </label>
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {next.length === 0 ? <p className="text-sm text-muted-foreground">Terminal status.</p> : null}
              {next.map((status) => (
                <ActionForm key={status} action={transition} className="grid gap-2 rounded-lg border p-3">
                  <input type="hidden" name="toStatus" value={status} />
                  <p className="text-sm font-medium">Move to {status}</p>
                  <Textarea name="comments" placeholder="Comments / evidence notes" />
                  {status === "Rework Required" ? (
                    <>
                      <Textarea name="correctiveAction" placeholder="Corrective action (required)" />
                      <Input name="revisedDueDate" type="date" />
                    </>
                  ) : null}
                  <SubmitButton size="sm">Confirm</SubmitButton>
                </ActionForm>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Evidence</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {item.attachments.map((a: { name: string; url: string }, idx: number) => (
                <a key={idx} href={a.url} className="text-primary hover:underline" target="_blank">
                  {a.name}
                </a>
              ))}
              <form action={attach} className="grid gap-2">
                <Input name="name" placeholder="File name" />
                <Input name="url" placeholder="https://... or blob URL" />
                <Button type="submit" size="sm" variant="outline">
                  Attach URL
                </Button>
              </form>
              <UploadEvidenceForm action={upload} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {item.comments.map((c: { authorId: unknown; body: string }, idx: number) => (
              <p key={idx}>
                <span className="font-medium">{userName(c.authorId)}</span> {c.body}
              </p>
            ))}
            <form action={comment} className="grid gap-2">
              <Textarea name="body" />
              <Button type="submit" size="sm">
                Add comment
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="mb-3 text-sm">
              {item.links.map((l: { type: string; targetId: unknown }, idx: number) => (
                <li key={idx}>
                  {l.type} → {linkTarget(l.targetId)?.key ?? String(l.targetId)} {linkTarget(l.targetId)?.title ?? ""}
                </li>
              ))}
            </ul>
            <form action={link} className="grid gap-2">
              <Select name="linkType">
                {LINK_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
              <Select name="targetId">
                {others.map((o) => (
                  <option key={String(o._id)} value={String(o._id)}>
                    {o.key} {o.title}
                  </option>
                ))}
              </Select>
              <Button type="submit" size="sm" variant="outline">
                Link
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Audit</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            {history.map((h) => (
              <p key={String(h._id)}>
                {h.action} · {fmtDate(h.createdAt)} {h.reason ? `· ${h.reason}` : ""}
              </p>
            ))}
            {!history.length ? <p className="text-muted-foreground">No workflow history yet.</p> : null}
          </CardContent>
        </Card>
        {item.type === "Deliverable" ? (
          <Card>
            <CardHeader>
              <CardTitle>Assessments</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {assessments.map((a) => (
                <p key={String(a._id)}>
                  Score {a.overallScore} · {fmtDate(a.reviewDate)}
                </p>
              ))}
              <a className="text-primary hover:underline" href={`/reviews/${itemId}`}>
                Open review scorecard
              </a>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
