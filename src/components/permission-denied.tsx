import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PermissionDenied({
  title = "You do not have access",
  description = "This page is limited to roles that can manage this area. Ask a PMO administrator if you need it.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-card p-8 text-center">
      <ShieldAlert className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden />
      <h1 className="text-page-title">{title}</h1>
      <p className="mt-2 text-body text-muted-foreground">{description}</p>
      <Link href="/dashboard" className={cn(buttonVariants(), "mt-6")}>
        Go to dashboard
      </Link>
    </div>
  );
}
