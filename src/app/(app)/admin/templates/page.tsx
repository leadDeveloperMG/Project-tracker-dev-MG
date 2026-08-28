import { requirePermission } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { ProjectTemplate } from "@/models/project";
import { PageHeader } from "@/components/page-header";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { saveTemplateAction } from "@/lib/actions/admin";
import { REPORTING_FREQUENCIES } from "@/lib/constants";

export default async function TemplatesPage() {
  await requirePermission("manageTemplates");
  await connectDB();
  const templates = await ProjectTemplate.find({}).sort({ name: 1 });
  return (
    <div>
      <PageHeader
        title="Project templates"
        description="PMO-approved initiation templates including default milestone skeleton (FR-001)."
      />
      <form action={saveTemplateAction} className="mb-6 max-w-xl space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-medium">New template</h2>
        <Field label="Name">
          <Input name="name" required />
        </Field>
        <Field label="Description">
          <Textarea name="description" />
        </Field>
        <Field label="Project type">
          <Input name="projectType" defaultValue="Delivery" />
        </Field>
        <Field label="Reporting frequency">
          <Select name="reportingFrequency" defaultValue="Weekly">
            {REPORTING_FREQUENCIES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </Field>
        <Field label="Milestones (name|offsetDays per line)">
          <Textarea name="milestones" defaultValue={"Kickoff|7\nDesign complete|30\nUAT|60\nGo-live|90"} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked /> Active
        </label>
        <Button type="submit">Create template</Button>
      </form>
      <div className="grid gap-4">
        {templates.map((t) => (
          <form key={String(t._id)} action={saveTemplateAction} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
            <input type="hidden" name="id" value={String(t._id)} />
            <Field label="Name">
              <Input name="name" defaultValue={t.name} />
            </Field>
            <Field label="Project type">
              <Input name="projectType" defaultValue={t.projectType} />
            </Field>
            <Field label="Reporting frequency">
              <Select name="reportingFrequency" defaultValue={t.reportingFrequency}>
                {REPORTING_FREQUENCIES.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" name="active" defaultChecked={t.active} /> Active
            </label>
            <Field label="Description" className="md:col-span-2">
              <Textarea name="description" defaultValue={t.description} />
            </Field>
            <Field label="Milestones" className="md:col-span-2">
              <Textarea
                name="milestones"
                defaultValue={t.defaultMilestones.map((m: { name: string; offsetDays: number }) => `${m.name}|${m.offsetDays}`).join("\n")}
              />
            </Field>
            <Button type="submit" variant="outline" size="sm">
              Save template
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
