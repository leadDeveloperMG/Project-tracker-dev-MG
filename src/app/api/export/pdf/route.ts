import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { accessibleProjects } from "@/lib/access";
import { textToPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const projects = await accessibleProjects(session.user);
  const lines = [
    `Generated ${new Date().toISOString()}`,
    `Viewer ${session.user.email} (${session.user.role})`,
    "",
    ...projects.map(
      (p) => `${p.code}  ${p.name}  ${p.status}  RAG ${p.overallRag}  ${p.businessUnit}`,
    ),
  ];
  const pdf = textToPdf("Project Tracker portfolio report", lines);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="tracker-report.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
