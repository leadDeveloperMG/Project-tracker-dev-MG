import { NextResponse } from "next/server";
import { assertCron, unauthorized } from "@/lib/cron";
import { dispatchOperationalAlerts } from "@/lib/services/notifications-cron";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!assertCron(request)) return unauthorized();
  const sent = await dispatchOperationalAlerts();
  return NextResponse.json({ ok: true, sent });
}
