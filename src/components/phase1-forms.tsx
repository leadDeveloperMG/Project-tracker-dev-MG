"use client";

import { useActionState } from "react";
import { createUserFormAction } from "@/lib/actions/admin";
import { Field, Input, Select } from "@/components/ui/field";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { SubmitButton } from "@/components/action-form";

export function InviteUserForm({
  users,
}: {
  users: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(createUserFormAction, undefined);
  return (
    <form action={action} className="space-y-3 rounded-xl border bg-card p-5">
      <h2 className="font-medium">Create user</h2>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Field label="Name">
        <Input name="name" required />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required />
      </Field>
      <Field label="Role">
        <Select name="role" defaultValue="team_member">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Manager">
        <Select name="managerId">
          <option value="">None</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Temporary password (optional)">
        <Input name="password" type="password" />
      </Field>
      <SubmitButton>Create</SubmitButton>
      <p className="text-xs text-muted-foreground">Leave password empty to issue a 7-day invite link.</p>
    </form>
  );
}

export function UploadEvidenceForm({
  action,
}: {
  action: (state: import("@/lib/safe-action").ActionState | undefined, formData: FormData) => Promise<import("@/lib/safe-action").ActionState>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="grid gap-2">
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Input name="file" type="file" required />
      <SubmitButton variant="outline" size="sm">
        Upload file
      </SubmitButton>
      <p className="text-xs text-muted-foreground">Stored in Vercel Blob when configured; local fallback is a data URL.</p>
    </form>
  );
}
