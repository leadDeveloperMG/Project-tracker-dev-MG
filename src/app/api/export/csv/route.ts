import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { accessibleProjects } from "@/lib/access";
import { Scorecard } from "@/models/kpi";
import { User, Team } from "@/models/user";
import { Project } from "@/models/project";
import { canViewIndividualScorecard, hasPermission } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const projects = await accessibleProjects(session.user);
  const lines = [["code", "name", "status", "businessUnit", "overallRag", "strategicObjective"]];
  for (const p of projects) {
    lines.push([p.code, p.name, p.status, p.businessUnit, p.overallRag, p.strategicObjective].map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`));
  }
  const cards = await Scorecard.find({}).limit(200);
  const users = await User.find({}).lean();
  const teams = await Team.find({}).lean();
  const scorecardProjects = await Project.find({ deletedAt: null }).lean();
  lines.push([]);
  lines.push(["scorecardSubject", "subjectType", "periodStart", "periodEnd", "overallScore", "status"]);
  for (const c of cards) {
    if (c.subjectType !== "member") {
      if (!hasPermission(session.user.role, "viewTeamScorecards")) continue;
      const team = teams.find((t) => String(t._id) === String(c.subjectId));
      const project = scorecardProjects.find((p) => String(p._id) === String(c.subjectId));
      const label =
        c.subjectType === "team"
          ? (team?.name ?? "Team")
          : project
            ? `${project.code} ${project.name}`
            : "Project";
      lines.push([
        label,
        c.subjectType,
        new Date(c.periodStart).toISOString().slice(0, 10),
        new Date(c.periodEnd).toISOString().slice(0, 10),
        String(c.overallScore ?? ""),
        `${c.approvalStatus}/${c.lockStatus}`,
      ]);
      continue;
    }
    const subject = users.find((u) => String(u._id) === String(c.subjectId));
    if (
      !canViewIndividualScorecard({
        viewerId: session.user.id,
        viewerRole: session.user.role,
        subjectId: String(c.subjectId),
        managerId: subject?.managerId ? String(subject.managerId) : null,
      })
    ) {
      continue;
    }
    lines.push([
      subject?.name ?? String(c.subjectId),
      c.subjectType,
      new Date(c.periodStart).toISOString().slice(0, 10),
      new Date(c.periodEnd).toISOString().slice(0, 10),
      String(c.overallScore ?? ""),
      `${c.approvalStatus}/${c.lockStatus}`,
    ]);
  }
  const csv = lines.map((row) => row.join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tracker-report.csv"',
      "Cache-Control": "no-store",
    },
  });
}
