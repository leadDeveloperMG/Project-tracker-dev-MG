import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission, type Permission } from "@/lib/rbac";
import { logger } from "@/lib/logger";
import type { Role } from "@/lib/constants";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) {
    logger.security("access.denied", { userId: user.id, role: user.role, permission });
    redirect("/forbidden");
  }
  return user;
}

export function actor(user: { id: string; role: Role; name?: string | null; email?: string | null }) {
  return { id: user.id, role: user.role, name: user.name ?? "", email: user.email ?? "" };
}
