"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { pending as pendingCopy, verbs } from "@/lib/copy";
import type { ActionState } from "@/lib/safe-action";

export function ActionForm({
  action,
  children,
  className,
  encType,
}: {
  action: (state: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  encType?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className} encType={encType}>
      {state?.error ? (
        <Alert tone="error" title="Could not save" referenceId={state.referenceId}>
          {state.error}
        </Alert>
      ) : null}
      {state?.message ? (
        <Alert tone="success" title="Saved">
          {state.message}
        </Alert>
      ) : null}
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  variant,
  size,
  pendingLabel,
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm" | "lg";
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} aria-busy={pending}>
      {pending ? (pendingLabel ?? pendingCopy.save) : children}
    </Button>
  );
}

export function FormStatus({ state }: { state?: ActionState }) {
  if (state?.error) {
    return (
      <Alert tone="error" title="Could not complete that action" referenceId={state.referenceId}>
        {state.error}
      </Alert>
    );
  }
  if (state?.message) {
    return (
      <Alert tone="success" title={verbs.save}>
        {state.message}
      </Alert>
    );
  }
  return null;
}
