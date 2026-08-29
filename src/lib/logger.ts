type LogLevel = "info" | "warn" | "error";

const SENSITIVE = /password|secret|token|authorization|cookie|session/i;

function sanitize(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    return SENSITIVE.test(value) ? "[redacted]" : value;
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE.test(key) ? "[redacted]" : sanitize(nested);
    }
    return out;
  }
  return value;
}

function write(level: LogLevel, event: string, fields: Record<string, unknown> = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    service: "jira-project-tracker",
    version: process.env.npm_package_version ?? "0.1.0",
    ...sanitize(fields) as Record<string, unknown>,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
  security: (event: string, fields?: Record<string, unknown>) =>
    write("info", event, { security: true, ...fields }),
};
