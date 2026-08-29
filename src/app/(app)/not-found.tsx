import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <h1 className="text-page-title">Page not found</h1>
      <p className="mt-2 text-body text-muted-foreground">That URL does not match a project, work item, or report you can open.</p>
      <Link href="/dashboard" className={cn(buttonVariants(), "mt-6")}>
        Go to dashboard
      </Link>
    </div>
  );
}
