import { requirePermission } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { ProjectTemplate } from "@/models/project";
import { User } from "@/models/user";
import { createProjectAction } from "@/lib/actions/projects";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUSES, REPORTING_FREQUENCIES } from "@/lib/constants";

export default async function NewProjectPage() {
  await requirePermission("createProject");
  await connectDB();
  const templates = await ProjectTemplate.find({ active: true });
  const users = await User.find({ active: true }).sort({ name: 1 });
  return (
    <>
      <PageHeader title="Create project" description="Mandatory charter fields from the approved template (FR-001/002)." />
      <Card>
        <CardContent>
          <form action={createProjectAction} className="grid gap-4 md:grid-cols-2">
            <Field label="Template">
              <Select name="templateId">
                <option value="">None</option>
                {templates.map((t) => (
                  <option key={String(t._id)} value={String(t._id)}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Project name">
              <Input name="name" required />
            </Field>
            <Field label="Code">
              <Input name="code" required placeholder="CPR" />
            </Field>
            <Field label="Business unit">
              <Input name="businessUnit" required />
            </Field>
            <Field label="Strategic objective">
              <Input name="strategicObjective" required />
            </Field>
            <Field label="Project type">
              <Input name="projectType" defaultValue="Delivery" />
            </Field>
            <Field label="Sponsor">
              <Select name="sponsorId" required>
                <option value="">Select</option>
                {users.map((u) => (
                  <option key={String(u._id)} value={String(u._id)}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Project manager">
              <Select name="managerId" required>
                <option value="">Select</option>
                {users.map((u) => (
                  <option key={String(u._id)} value={String(u._id)}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Team lead">
              <Select name="teamLeadId">
                <option value="">Select</option>
                {users.map((u) => (
                  <option key={String(u._id)} value={String(u._id)}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start date">
              <Input name="startDate" type="date" required />
            </Field>
            <Field label="Target end date">
              <Input name="targetEndDate" type="date" required />
            </Field>
            <Field label="Reporting frequency">
              <Select name="reportingFrequency">
                {REPORTING_FREQUENCIES.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </Field>
            <Field label="Charter" className="md:col-span-2">
              <Textarea name="charter" />
            </Field>
            <Field label="Scope baseline" className="md:col-span-2">
              <Textarea name="scopeBaseline" />
            </Field>
            <Field label="Team members" className="md:col-span-2">
              <div className="grid max-h-36 grid-cols-2 gap-1 overflow-auto rounded-lg border p-2 text-sm">
                {users.map((u) => (
                  <label key={String(u._id)} className="flex items-center gap-2">
                    <input type="checkbox" name="teamMemberIds" value={String(u._id)} />
                    {u.name}
                  </label>
                ))}
              </div>
            </Field>
            <div className="md:col-span-2">
              <Button type="submit">Create from template</Button>
            </div>
            <p className="text-xs text-muted-foreground md:col-span-2">
              Status starts as Proposed. Moving to In Progress requires manager, sponsor, dates, and a milestone plan
              ({PROJECT_STATUSES[3]}).
            </p>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
