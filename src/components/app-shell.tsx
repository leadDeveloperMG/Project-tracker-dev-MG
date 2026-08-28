import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import { hasPermission, NAV_ITEMS } from "@/lib/rbac";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";

export function AppShell({
  user,
  unread,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: Role };
  unread: number;
  children: React.ReactNode;
}) {
  const items = NAV_ITEMS.filter((item) => !item.permission || hasPermission(user.role, item.permission));
  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5">
          <LayoutDashboard className="size-5 text-sky-300" />
          <div>
            <p className="text-sm font-semibold tracking-tight">Project Tracker</p>
            <p className="text-[11px] text-sidebar-foreground/60">Governance & KRA/KPI</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/notifications"
            className="rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            Notifications{unread ? ` (${unread})` : ""}
          </Link>
        </nav>
        <div className="border-t border-sidebar-border px-4 py-4">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">{ROLE_LABELS[user.role]}</p>
          <form action={logoutAction} className="mt-3">
            <Button variant="outline" size="sm" className="w-full bg-transparent text-sidebar-foreground">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function ProjectNav({ id }: { id: string }) {
  const links = [
    ["Overview", ""],
    ["Work", "/work"],
    ["Health", "/health"],
    ["Risks", "/risks"],
    ["Quality", "/quality"],
    ["Status reports", "/reports"],
  ] as const;
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b">
      {links.map(([label, suffix]) => (
        <Link
          key={suffix}
          href={`/projects/${id}${suffix}`}
          className="border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
