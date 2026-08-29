"use client";

import { Button } from "@/components/ui/button";
import { verbs } from "@/lib/copy";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-md rounded-xl border bg-card p-6">
          <h1 className="text-page-title">The application hit an unexpected error</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Try again. If this persists, contact support with the approximate time it happened.
          </p>
          <Button className="mt-4" type="button" onClick={reset}>
            {verbs.retry}
          </Button>
        </div>
      </body>
    </html>
  );
}
