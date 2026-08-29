import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error("no db");
    await db.admin().command({ ping: 1 });
    return NextResponse.json({
      status: "ok",
      checks: { database: "ok" },
    });
  } catch {
    return NextResponse.json({ status: "degraded", checks: { database: "fail" } }, { status: 503 });
  }
}
