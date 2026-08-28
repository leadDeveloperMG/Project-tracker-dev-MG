"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/performance";

export async function markReadAction(id: string) {
  const user = await requireUser();
  await connectDB();
  await Notification.updateOne({ _id: id, userId: user.id }, { read: true });
  revalidatePath("/notifications");
}
