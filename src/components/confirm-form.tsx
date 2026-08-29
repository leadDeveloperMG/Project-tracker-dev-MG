"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { verbs } from "@/lib/copy";

export function ConfirmForm({
  action,
  title,
  description,
  confirmLabel = verbs.archive,
  triggerLabel,
  variant = "destructive",
}: {
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  triggerLabel?: string;
  variant?: "destructive" | "outline";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button type="button" variant={variant} size="sm" onClick={() => ref.current?.showModal()}>
        {triggerLabel ?? confirmLabel}
      </Button>
      <dialog
        ref={ref}
        className="w-full max-w-md rounded-xl border bg-card p-0 text-card-foreground shadow-md backdrop:bg-foreground/40"
      >
        <form action={action} className="grid gap-4 p-5">
          <div>
            <h2 className="text-section-title">{title}</h2>
            <p className="mt-2 text-body text-muted-foreground">{description}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => ref.current?.close()}>
              {verbs.cancel}
            </Button>
            <Button type="submit" variant={variant === "destructive" ? "destructive" : "default"}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
