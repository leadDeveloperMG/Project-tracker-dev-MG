import Link from "next/link";
import { cn } from "@/lib/utils";

export function ProjectTabs({ projectId, active }: { projectId: string; active: string }) {
  const tabs = [
    { href: `/projects/${projectId}`, key: "overview", label: "Overview" },
    { href: `/projects/${projectId}/work`, key: "work", label: "Work" },
    { href: `/projects/${projectId}/health`, key: "health", label: "Health" },
    { href: `/projects/${projectId}/risks`, key: "risks", label: "Risks" },
    { href: `/projects/${projectId}/reports`, key: "reports", label: "Status reports" },
    { href: `/projects/${projectId}/quality`, key: "quality", label: "Data quality" },
  ];
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "border-b-2 px-3 py-2 text-sm",
            active === tab.key
              ? "border-foreground font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
