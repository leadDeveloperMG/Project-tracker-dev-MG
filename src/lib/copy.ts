/** Canonical verbs and status copy. Use these instead of inventing synonyms per screen. */
export const verbs = {
  create: "Create",
  save: "Save",
  archive: "Archive",
  restore: "Restore",
  signIn: "Sign in",
  signOut: "Sign out",
  filter: "Apply filters",
  refresh: "Refresh",
  invite: "Invite",
  retry: "Try again",
  cancel: "Cancel",
  confirm: "Confirm",
} as const;

export const pending = {
  create: "Creating…",
  save: "Saving…",
  signIn: "Signing in…",
  archive: "Archiving…",
  restore: "Restoring…",
} as const;

export const genericError = "Something went wrong. Try again, or share the reference ID with support.";
