export function featureEnabled(name: string, fallback = false) {
  const value = process.env[`FEATURE_${name.toUpperCase()}`];
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}
