import { cn } from "@/lib/utils";
import type { Rag } from "@/lib/constants";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & { tone?: "neutral" | "green" | "amber" | "red" | "blue" | "slate" }) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    blue: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function RagBadge({ value, rag }: { value?: string | null; rag?: string | null }) {
  const resolved = value ?? rag;
  const tone = resolved === "green" ? "green" : resolved === "red" ? "red" : resolved === "insufficient" ? "slate" : "amber";
  return <Badge tone={tone}>{resolved ?? "n/a"}</Badge>;
}

export function ragTone(value?: Rag | string | null) {
  if (value === "green") return "green" as const;
  if (value === "red") return "red" as const;
  return "amber" as const;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active" || status === "approved" || status === "Done" || status === "Accepted"
      ? "green"
      : status === "inactive" || status === "rejected" || status === "Blocked"
        ? "red"
        : status === "draft" || status === "pending"
          ? "amber"
          : "slate";
  return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}
