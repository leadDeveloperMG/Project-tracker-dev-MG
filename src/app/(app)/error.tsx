"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h1 className="text-lg font-semibold">That action could not be completed</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button className="mt-4" type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
