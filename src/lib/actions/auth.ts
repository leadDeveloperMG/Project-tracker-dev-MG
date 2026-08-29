"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { logger } from "@/lib/logger";
import { validatePassword } from "@/lib/password";
import { AppError } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { writeAudit } from "@/models/audit";
import { runAction, type ActionState } from "@/lib/safe-action";

export async function loginAction(
  _prev: { error?: string; email?: string } | undefined,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const ip = await clientIp();
  const limited = rateLimit(`login:${ip}:${email}`, 5, 15 * 60_000);
  if (!limited.ok) {
    logger.security("auth.rate_limited", { email, ip });
    return { error: "Too many sign-in attempts. Try again in 15 minutes.", email };
  }
  try {
    await signIn("credentials", {
      email,
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      logger.security("auth.failed", { email, ip, reason: error.type });
      return { error: "Invalid email or password", email };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function acceptInviteAction(token: string, formData: FormData) {
  await connectDB();
  const password = String(formData.get("password") ?? "");
  const invalid = validatePassword(password);
  if (invalid) throw new AppError(invalid, { fieldErrors: { password: invalid } });
  const user = await User.findOne({
    inviteToken: token,
    inviteExpiresAt: { $gt: new Date() },
    active: true,
  });
  if (!user) throw new AppError("Invite is invalid or expired");
  user.passwordHash = await bcrypt.hash(password, 10);
  user.inviteToken = null;
  user.inviteExpiresAt = null;
  await user.save();
  logger.security("auth.invite_accepted", { userId: String(user._id) });
  redirect("/login");
}

export async function changePasswordAction(
  _prev: { error?: string; message?: string } | undefined,
  formData: FormData,
) {
  const user = await requireUser();
  await connectDB();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const invalid = validatePassword(next);
  if (invalid) return { error: invalid };
  if (next !== confirm) return { error: "New password and confirmation do not match." };
  const record = await User.findById(user.id);
  if (!record?.passwordHash) return { error: "Account cannot change password." };
  const ok = await bcrypt.compare(current, record.passwordHash);
  if (!ok) {
    logger.security("auth.password_change_failed", { userId: user.id });
    return { error: "Current password is incorrect." };
  }
  record.passwordHash = await bcrypt.hash(next, 10);
  await record.save();
  await writeAudit({ actorId: user.id, action: "user.password_change", entityType: "User", entityId: user.id });
  logger.security("auth.password_changed", { userId: user.id });
  return { message: "Password updated." };
}

export async function deactivateOwnAccountForm(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser();
    const typed = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (typed !== (user.email ?? "").toLowerCase()) {
      throw new AppError("Type your email address to confirm deactivation.");
    }
    await connectDB();
    await User.findByIdAndUpdate(user.id, { active: false });
    await writeAudit({ actorId: user.id, action: "user.deactivate_self", entityType: "User", entityId: user.id });
    logger.security("auth.account_deactivated", { userId: user.id });
    await signOut({ redirectTo: "/login" });
  });
}
