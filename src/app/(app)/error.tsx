"use client";

import { Button } from "@/components/ui/button";
import { verbs } from "@/lib/copy";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h1 className="text-page-title">That action could not be completed</h1>
      <p className="mt-2 text-body text-muted-foreground">
        Refresh and try again. If it keeps happening, share the time of the error with support. Internal details are not shown here.
      </p>
      <Button className="mt-4" type="button" onClick={reset}>
        {verbs.retry}
      </Button>
    </div>
  );
}
