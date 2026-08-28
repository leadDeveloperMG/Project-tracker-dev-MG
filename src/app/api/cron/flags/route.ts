import { NextResponse } from "next/server";
import { assertCron, unauthorized } from "@/lib/cron";
import { refreshFlags } from "@/lib/services/flags-service";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/project";
import { refreshProjectHealth } from "@/lib/services/health-service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!assertCron(request)) return unauthorized();
  await connectDB();
  const updated = await refreshFlags();
  const projects = await Project.find({ deletedAt: null }).select("_id");
  for (const project of projects) {
    await refreshProjectHealth(String(project._id));
  }
  return NextResponse.json({ ok: true, flagsUpdated: updated, projects: projects.length });
}
