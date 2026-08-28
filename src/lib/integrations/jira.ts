export function isJiraSyncEnabled() {
  return process.env.JIRA_SYNC_ENABLED === "true";
}

export function jiraConfigStatus() {
  if (!isJiraSyncEnabled()) {
    return "Disabled. Work tracking runs standalone in this app.";
  }
  const missing = ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"].filter((key) => !process.env[key]);
  if (missing.length) {
    return `Enabled but incomplete. Missing ${missing.join(", ")}.`;
  }
  return "Credentials present. Live issue pull is stubbed for v1 and will not mutate Jira or local work items.";
}

export async function syncJiraIssues() {
  if (!isJiraSyncEnabled()) {
    return { pulled: 0, message: "JIRA_SYNC_ENABLED is false." };
  }
  return {
    pulled: 0,
    message: "Jira adapter scaffold only. No issues were pulled.",
  };
}
