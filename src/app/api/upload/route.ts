import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { WorkItem } from "@/models/work-item";
import { assertProjectAccess } from "@/lib/access";
import mongoose from "mongoose";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const requestUrl = new URL(request.url);
  const itemId = String(form.get("itemId") ?? requestUrl.searchParams.get("itemId") ?? "");
  const file = form.get("file");
  if (!itemId || !(file instanceof File)) {
    return NextResponse.json({ error: "itemId and file are required" }, { status: 400 });
  }
  await connectDB();
  const item = await WorkItem.findById(itemId);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await assertProjectAccess(session.user, String(item.projectId));

  let url = "";
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`evidence/${itemId}/${file.name}`, file, { access: "public", addRandomSuffix: true });
    url = blob.url;
  } else {
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 700_000) {
      return NextResponse.json({ error: "File too large for local fallback. Configure Vercel Blob." }, { status: 413 });
    }
    url = `data:${file.type || "application/octet-stream"};base64,${buf.toString("base64")}`;
  }
  item.attachments.push({
    name: file.name,
    url,
    uploadedBy: new mongoose.Types.ObjectId(session.user.id),
    uploadedAt: new Date(),
  });
  await item.save();
  return NextResponse.redirect(new URL(`/projects/${item.projectId}/work/${item._id}`, request.url), 303);
}
