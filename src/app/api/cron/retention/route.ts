import { NextResponse } from "next/server";
import { assertCron, unauthorized } from "@/lib/cron";
import { applyRetentionPolicies } from "@/lib/services/retention-service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!assertCron(request)) return unauthorized();
  const summary = await applyRetentionPolicies();
  return NextResponse.json({ ok: true, summary });
}
