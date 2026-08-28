import { NextResponse } from "next/server";
import { assertCron, unauthorized } from "@/lib/cron";
import { refreshKpiResults } from "@/lib/services/kpi-service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!assertCron(request)) return unauthorized();
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 3);
  periodEnd.setDate(0);
  const count = await refreshKpiResults(periodStart, periodEnd);
  return NextResponse.json({ ok: true, upserted: count, periodStart, periodEnd });
}
