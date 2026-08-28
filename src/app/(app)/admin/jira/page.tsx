import { requirePermission } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { isJiraSyncEnabled, jiraConfigStatus } from "@/lib/integrations/jira";

export default async function JiraAdminPage() {
  await requirePermission("manageJira");
  const enabled = isJiraSyncEnabled();
  const status = jiraConfigStatus();
  return (
    <div>
      <PageHeader
        title="Jira adapter"
        description="Optional later integration. The product runs fully standalone. Live OAuth/sync is not enabled in v1."
      />
      <div className="max-w-xl rounded-xl border bg-white p-5 text-sm">
        <p>
          Sync flag: <strong>{enabled ? "on" : "off"}</strong>
        </p>
        <p className="mt-2 text-muted-foreground">{status}</p>
        <p className="mt-4">
          Set <code>JIRA_SYNC_ENABLED=true</code> plus <code>JIRA_BASE_URL</code>, <code>JIRA_EMAIL</code>, and{" "}
          <code>JIRA_API_TOKEN</code> when you are ready to pull issues. Until then, work items live only in this app.
        </p>
      </div>
    </div>
  );
}
