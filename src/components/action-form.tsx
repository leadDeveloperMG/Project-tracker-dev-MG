"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
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
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      {children}
    </form>
  );
}

export function SubmitButton({ children, variant, size }: { children: React.ReactNode; variant?: "default" | "outline" | "destructive"; size?: "default" | "sm" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? "Saving…" : children}
    </Button>
  );
}
