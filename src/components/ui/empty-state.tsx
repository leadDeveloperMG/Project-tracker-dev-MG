import { FolderPlus, Inbox, ShieldAlert, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

const icons = {
  inbox: Inbox,
  create: FolderPlus,
  permission: ShieldAlert,
  offline: WifiOff,
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon = "inbox",
  className,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: keyof typeof icons;
  className?: string;
}) {
  const Icon = icons[icon];
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <Icon className="mb-3 size-8 text-muted-foreground" aria-hidden />
      <h2 className="text-section-title">{title}</h2>
      <p className="mt-2 max-w-md text-body text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={cn(buttonVariants(), "mt-5")}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
