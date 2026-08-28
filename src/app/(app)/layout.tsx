import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/performance";
import { AppShell } from "@/components/app-shell";
import type { Role } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await connectDB();
  const unread = await Notification.countDocuments({ userId: session.user.id, read: false });
  return (
    <AppShell user={{ name: session.user.name, email: session.user.email, role: session.user.role as Role }} unread={unread}>
      {children}
    </AppShell>
  );
}
