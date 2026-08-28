import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { assertProjectAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { WorkItem } from "@/models/work-item";
import { createWorkItemFormAction } from "@/lib/actions/work-items";
import { PageHeader, ProjectNav } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { PRIORITIES, WORK_TYPES } from "@/lib/constants";
import { ActionForm, SubmitButton } from "@/components/action-form";

export default async function NewWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  await connectDB();
  const project = await assertProjectAccess(user, id).catch(() => null);
  if (!project) notFound();
  const users = await User.find({ active: true }).sort({ name: 1 });
  const parents = await WorkItem.find({ projectId: id, deletedAt: null }).select("key title type");
  const action = createWorkItemFormAction.bind(null, id);
  return (
    <>
      <PageHeader title="New work item" />
      <ProjectNav id={id} />
      <Card>
        <CardContent>
          <ActionForm action={action} className="grid gap-4 md:grid-cols-2">
            <Field label="Type">
              <Select name="type" defaultValue="Task">
                {WORK_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select name="priority" defaultValue="Medium">
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Title" className="md:col-span-2">
              <Input name="title" required />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <Textarea name="description" />
            </Field>
            <Field label="Parent">
              <Select name="parentId">
                <option value="">None</option>
                {parents.map((p) => (
                  <option key={String(p._id)} value={String(p._id)}>
                    {p.key} {p.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Owner / assignee">
              <Select name="assigneeId">
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={String(u._id)} value={String(u._id)}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Approver">
              <Select name="approverId">
                <option value="">None</option>
                {users.map((u) => (
                  <option key={String(u._id)} value={String(u._id)}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due date">
              <Input name="dueDate" type="date" />
            </Field>
            <Field label="Planned date">
              <Input name="plannedDate" type="date" />
            </Field>
            <Field label="Baseline date">
              <Input name="baselineDate" type="date" />
            </Field>
            <Field label="Forecast date">
              <Input name="forecastDate" type="date" />
            </Field>
            <Field label="Planned effort">
              <Input name="plannedEffort" type="number" />
            </Field>
            <Field label="Acceptance criteria" className="md:col-span-2">
              <Textarea name="acceptanceCriteria" />
            </Field>
            <Field label="Likelihood (risk 1-5)">
              <Input name="likelihood" type="number" min={1} max={5} />
            </Field>
            <Field label="Impact (risk 1-5)">
              <Input name="impact" type="number" min={1} max={5} />
            </Field>
            <Field label="Mitigation" className="md:col-span-2">
              <Textarea name="mitigation" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="committed" /> Committed work
            </label>
            <div className="md:col-span-2">
              <SubmitButton>Create</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
