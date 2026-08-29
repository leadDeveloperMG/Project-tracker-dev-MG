import { headers } from "next/headers";

export async function clientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

export async function requestIdFromHeaders() {
  const h = await headers();
  return h.get("x-request-id") ?? h.get("x-vercel-id") ?? null;
}
