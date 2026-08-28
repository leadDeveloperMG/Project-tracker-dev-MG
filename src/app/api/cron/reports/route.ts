import { NextResponse } from "next/server";
import { assertCron, unauthorized } from "@/lib/cron";
import { connectDB } from "@/lib/db";
import { ScheduledReport } from "@/models/performance";
import { Project } from "@/models/project";
import { notify } from "@/lib/services/notify";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!assertCron(request)) return unauthorized();
  await connectDB();
  const jobs = await ScheduledReport.find({ active: true });
  const projects = await Project.find({ deletedAt: null }).select("name code overallRag status businessUnit");
  const summary = projects
    .map((p) => `${p.code} ${p.name} · ${p.status} · ${p.overallRag}`)
    .join("\n");
  let sent = 0;
  for (const job of jobs) {
    for (const recipientId of job.recipientIds) {
      await notify({
        userId: String(recipientId),
        type: "scheduled-report",
        title: job.name,
        body: summary.slice(0, 1500) || "No projects in view.",
        href: "/reports",
        email: true,
      });
      sent += 1;
    }
    job.lastSentAt = new Date();
    await job.save();
  }
  return NextResponse.json({ ok: true, sent, jobs: jobs.length });
}
