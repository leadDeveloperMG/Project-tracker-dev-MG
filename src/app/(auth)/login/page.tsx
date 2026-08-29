"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/fields";
import { Alert } from "@/components/ui/alert";
import { OfflineBanner } from "@/components/offline-banner";
import { pending, verbs } from "@/lib/copy";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, undefined);
  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-6">
      <div className="w-full max-w-md space-y-4">
        <OfflineBanner />
        <Card>
          <CardHeader>
            <CardTitle>Project Tracker</CardTitle>
            <CardDescription>Sign in to govern delivery, health, and KRA/KPI reporting.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="grid gap-4">
              <Field label="Email">
                <Input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  defaultValue={state?.email ?? "pm@tracker.local"}
                />
              </Field>
              <Field label="Password">
                <Input name="password" type="password" autoComplete="current-password" required defaultValue="Password123!" />
              </Field>
              {state?.error ? (
                <Alert tone="error" title="Could not sign in">
                  {state.error}
                </Alert>
              ) : null}
              <Button type="submit" disabled={isPending} aria-busy={isPending}>
                {isPending ? pending.signIn : verbs.signIn}
              </Button>
              <p className="text-caption">
                Demo accounts use <code>Password123!</code>. Try developer@, pm@, pmo@, exec@, or admin@tracker.local.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
