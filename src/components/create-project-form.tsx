"use client";

import { useActionState } from "react";
import { createProjectFormAction } from "@/lib/actions/projects";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { pending, verbs } from "@/lib/copy";
import { PROJECT_STATUSES, REPORTING_FREQUENCIES } from "@/lib/constants";

type Option = { id: string; name: string };

export function CreateProjectForm({
  templates,
  users,
}: {
  templates: Option[];
  users: Option[];
}) {
  const [state, action, isPending] = useActionState(createProjectFormAction, undefined);
  const errors = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      {state?.error ? (
        <Alert tone="error" title="Could not create project" referenceId={state.referenceId} className="md:col-span-2">
          {state.error}
        </Alert>
      ) : null}
      <Field label="Template" error={errors.templateId}>
        <Select name="templateId">
          <option value="">None</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Project name" error={errors.name}>
        <Input name="name" required />
      </Field>
      <Field label="Code" error={errors.code} hint="Short unique key, for example CPR.">
        <Input name="code" required placeholder="CPR" />
      </Field>
      <Field label="Business unit" error={errors.businessUnit}>
        <Input name="businessUnit" required />
      </Field>
      <Field label="Strategic objective" error={errors.strategicObjective}>
        <Input name="strategicObjective" required />
      </Field>
      <Field label="Project type">
        <Input name="projectType" defaultValue="Delivery" />
      </Field>
      <Field label="Sponsor" error={errors.sponsorId}>
        <Select name="sponsorId" required>
          <option value="">Select</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Project manager">
        <Select name="managerId" required>
          <option value="">Select</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Team lead">
        <Select name="teamLeadId">
          <option value="">Select</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Start date" error={errors.startDate}>
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
            <label key={u.id} className="flex min-h-11 items-center gap-2">
              <input type="checkbox" name="teamMemberIds" value={u.id} />
              {u.name}
            </label>
          ))}
        </div>
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending ? pending.create : `${verbs.create} project`}
        </Button>
      </div>
      <p className="text-caption md:col-span-2">
        Status starts as Proposed. Moving to In Progress requires manager, sponsor, dates, and a milestone plan (
        {PROJECT_STATUSES[3]}).
      </p>
    </form>
  );
}
