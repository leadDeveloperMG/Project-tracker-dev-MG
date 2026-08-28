import { requirePermission } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { RetentionPolicy } from "@/models/performance";
import { PageHeader } from "@/components/page-header";
import { Field, Input, Select } from "@/components/ui/field";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveRetentionForm } from "@/lib/actions/admin";

export default async function RetentionPage() {
  await requirePermission("manageRetention");
  await connectDB();
  const policies = await RetentionPolicy.find({}).lean();
  return (
    <div>
      <PageHeader
        title="Retention & archival"
        description="Organization-approved retention for audit logs, scorecards, and work items. Cron applies the policy weekly."
      />
      <ActionForm action={saveRetentionForm} className="mb-6 max-w-xl space-y-3 rounded-xl border bg-white p-5">
        <Field label="Entity">
          <Select name="entityType" defaultValue="AuditLog">
            <option>AuditLog</option>
            <option>Scorecard</option>
            <option>WorkItem</option>
            <option>Notification</option>
            <option>KpiResult</option>
          </Select>
        </Field>
        <Field label="Retain days">
          <Input name="retainDays" type="number" defaultValue={2555} />
        </Field>
        <Field label="Action">
          <Select name="action" defaultValue="archive">
            <option value="archive">archive</option>
            <option value="delete">delete</option>
          </Select>
        </Field>
        <SubmitButton>Save policy</SubmitButton>
      </ActionForm>
      <ul className="text-sm">
        {policies.map((p) => (
          <li key={String(p._id)}>
            {p.entityType}: {p.retainDays} days · {p.action}
          </li>
        ))}
      </ul>
    </div>
  );
}
