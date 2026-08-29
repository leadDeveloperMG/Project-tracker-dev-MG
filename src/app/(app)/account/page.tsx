import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/fields";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Alert } from "@/components/ui/alert";
import { changePasswordAction, deactivateOwnAccountForm } from "@/lib/actions/auth";
import { pending, verbs } from "@/lib/copy";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Account" description="Password and deactivation. Administrators change roles on Users & teams." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={changePasswordAction} className="grid gap-4">
              <Field label="Current password">
                <Input name="currentPassword" type="password" autoComplete="current-password" required />
              </Field>
              <Field label="New password" hint="At least 10 characters, with upper, lower, and a number.">
                <Input name="password" type="password" autoComplete="new-password" required />
              </Field>
              <Field label="Confirm new password">
                <Input name="confirmPassword" type="password" autoComplete="new-password" required />
              </Field>
              <SubmitButton pendingLabel={pending.save}>{verbs.save}</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deactivate account</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert tone="warning" title="This signs you out immediately" className="mb-4">
              You cannot sign in until an administrator reactivates the account. Type your email to confirm.
            </Alert>
            <ActionForm action={deactivateOwnAccountForm} className="grid gap-4">
              <Field label="Email confirmation">
                <Input name="email" type="email" autoComplete="off" required placeholder={user.email ?? ""} />
              </Field>
              <SubmitButton variant="destructive" pendingLabel="Deactivating…">
                Deactivate account
              </SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
