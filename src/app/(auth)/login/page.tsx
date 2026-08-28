"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/fields";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Jira Project Tracker</CardTitle>
          <CardDescription>Sign in to the governance, delivery, and KRA/KPI platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4">
            <Field label="Email">
              <Input name="email" type="email" required defaultValue="pm@tracker.local" />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" required defaultValue="Password123!" />
            </Field>
            {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Demo users use <code>Password123!</code>. Try pm@, pmo@, exec@, member@, hr@tracker.local.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
