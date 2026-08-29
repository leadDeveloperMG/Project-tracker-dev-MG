"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { hasPermission, NAV_ITEMS } from "@/lib/rbac";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { OfflineBanner } from "@/components/offline-banner";
import { verbs } from "@/lib/copy";
import { cn } from "@/lib/utils";

export function AppShell({
  user,
  unread,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: Role };
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS.filter((item) => !item.permission || hasPermission(user.role, item.permission));

  function navClass(href: string) {
    const active = href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
    return cn(
      "rounded-lg px-3 py-2.5 text-sm min-h-11 flex items-center text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
    );
  }

  const nav = (
    <>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5 px-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
            className={navClass(item.href)}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/notifications"
          aria-current={pathname.startsWith("/notifications") ? "page" : undefined}
          className={navClass("/notifications")}
          onClick={() => setOpen(false)}
        >
          Notifications{unread ? ` (${unread})` : ""}
        </Link>
      </nav>
      <div className="border-t border-sidebar-border px-4 py-4">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-caption text-sidebar-foreground/60">{ROLE_LABELS[user.role]}</p>
        <Link
          href="/account"
          className="mt-2 block text-caption text-sidebar-foreground/80 underline"
          onClick={() => setOpen(false)}
        >
          Account
        </Link>
        <form action={logoutAction} className="mt-3">
          <Button type="submit" variant="outline" size="sm" className="h-11 w-full bg-transparent text-sidebar-foreground">
            {verbs.signOut}
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <LayoutDashboard className="size-5 text-sky-300" aria-hidden />
          <div>
            <p className="text-sm font-semibold tracking-tight">Project Tracker</p>
            <p className="text-caption text-sidebar-foreground/60">Governance & KRA/KPI</p>
          </div>
        </div>
        {nav}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex items-center justify-between px-4 py-4">
              <p className="text-sm font-semibold">Menu</p>
              <Button type="button" variant="ghost" size="icon" className="text-sidebar-foreground" onClick={() => setOpen(false)}>
                <X className="size-5" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
          <Button type="button" variant="outline" size="icon" className="touch-target" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <p className="text-sm font-semibold">Project Tracker</p>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
          <OfflineBanner />
          {children}
        </main>
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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-page-title">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-body text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function ProjectNav({ id }: { id: string }) {
  const pathname = usePathname();
  const links = [
    ["Overview", ""],
    ["Work", "/work"],
    ["Health", "/health"],
    ["Risks", "/risks"],
    ["Quality", "/quality"],
    ["Status reports", "/reports"],
  ] as const;
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b" role="tablist" aria-label="Project sections">
      {links.map(([label, suffix]) => {
        const href = `/projects/${id}${suffix}`;
        const active = suffix === "" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={suffix}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "min-h-11 shrink-0 border-b-2 px-3 py-2 text-sm",
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:border-primary hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
