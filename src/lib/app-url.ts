/** Env keys used to resolve the public origin. Tests may pass a partial object. */
export type PublicOriginEnv = {
  AUTH_URL?: string;
  APP_URL?: string;
  AUTH_TRUST_HOST?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  [key: string]: string | undefined;
};

function withProtocol(value: string) {
  return value.includes("://") ? value : `https://${value}`;
}

export function isLoopbackOrigin(value?: string | null) {
  if (!value) return true;
  try {
    const { hostname } = new URL(withProtocol(value));
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "[::1]";
  } catch {
    return /localhost|127\.0\.0\.1/.test(value);
  }
}

export function normalizeOrigin(value: string) {
  return withProtocol(value).replace(/\/$/, "");
}

/** Public site origin. On Vercel, ignores AUTH_URL/APP_URL when they still point at localhost. */
export function resolvePublicOrigin(env: PublicOriginEnv = process.env) {
  const explicit = env.APP_URL || env.AUTH_URL;
  const onVercel = Boolean(env.VERCEL);
  if (explicit && !(onVercel && isLoopbackOrigin(explicit))) {
    return normalizeOrigin(explicit);
  }
  if (onVercel) {
    const productionHost = env.VERCEL_PROJECT_PRODUCTION_URL;
    const deployHost = env.VERCEL_URL;
    const host = env.VERCEL_ENV === "production" && productionHost ? productionHost : deployHost || productionHost;
    if (host) return normalizeOrigin(host);
  }
  return normalizeOrigin(explicit || "http://localhost:3000");
}

export function applyPublicOriginEnv(env: PublicOriginEnv = process.env) {
  const origin = resolvePublicOrigin(env);
  env.AUTH_URL = origin;
  env.APP_URL = origin;
  env.AUTH_TRUST_HOST = env.AUTH_TRUST_HOST || "true";
  return origin;
}

export async function publicOrigin() {
  const resolved = resolvePublicOrigin();
  if (!isLoopbackOrigin(resolved)) return resolved;
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || (process.env.VERCEL ? "https" : "http");
    if (host) return normalizeOrigin(`${proto}://${host}`);
  } catch {
    /* not in a request, e.g. cron */
  }
  return resolved;
}
