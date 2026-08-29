"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function OnboardingBanner({
  canCreateProject,
  canInvite,
  hasProjects,
}: {
  canCreateProject: boolean;
  canInvite: boolean;
  hasProjects: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden || hasProjects) return null;
  return (
    <Alert tone="info" title="Get to a first useful outcome" className="mb-6">
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-body">
        <li>
          {canCreateProject ? (
            <Link href="/projects/new" className="font-medium underline">
              Create a project
            </Link>
          ) : (
            "Ask a project manager to create a project you can join"
          )}
        </li>
        <li>
          {canInvite ? (
            <Link href="/admin/users" className="font-medium underline">
              Invite a teammate
            </Link>
          ) : (
            "Open the project and add work items as they are assigned"
          )}
        </li>
        <li>Create a work item so health, reviews, and scorecards have real data.</li>
      </ol>
      <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setHidden(true)}>
        Dismiss
      </Button>
    </Alert>
  );
}
