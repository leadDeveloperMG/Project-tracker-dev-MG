import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { PageHeader } from "@/components/page-header";

const links = [
  { href: "/admin/users", label: "Users & teams" },
  { href: "/admin/templates", label: "Project templates" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/catalog", label: "KRA/KPI catalog" },
  { href: "/admin/data-quality", label: "Portfolio data quality" },
  { href: "/admin/retention", label: "Retention & archival" },
  { href: "/admin/jira", label: "Jira adapter (stub)" },
];

export default async function AdminPage() {
  await requirePermission("manageTemplates");
  return (
    <div>
      <PageHeader title="Admin" description="PMO governance: templates, catalog, users, retention." />
      <div className="grid gap-3 md:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-xl border bg-white p-5 hover:bg-muted/40">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
