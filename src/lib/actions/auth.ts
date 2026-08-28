"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
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
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  const user = await User.findOne({
    inviteToken: token,
    inviteExpiresAt: { $gt: new Date() },
    active: true,
  });
  if (!user) throw new Error("Invite is invalid or expired");
  user.passwordHash = await bcrypt.hash(password, 10);
  user.inviteToken = null;
  user.inviteExpiresAt = null;
  await user.save();
  redirect("/login");
}
