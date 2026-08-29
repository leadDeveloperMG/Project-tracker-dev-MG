import { cn } from "@/lib/utils";

const tones = {
  info: "border-info/30 bg-info/10 text-foreground",
  success: "border-success/30 bg-success/10 text-foreground",
  warning: "border-warning/40 bg-warning/15 text-foreground",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  referenceId,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children: React.ReactNode;
  className?: string;
  referenceId?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? "mt-1 text-body" : undefined}>{children}</div>
      {referenceId ? <p className="mt-2 text-caption">Reference {referenceId}</p> : null}
    </div>
  );
}
