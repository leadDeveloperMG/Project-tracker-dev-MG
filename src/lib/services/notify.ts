import { Resend } from "resend";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/performance";
import { User } from "@/models/user";

export async function notify(opts: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  email?: boolean;
}) {
  await connectDB();
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const duplicate = await Notification.findOne({
    userId: opts.userId,
    type: opts.type,
    href: opts.href ?? null,
    createdAt: { $gte: since },
  });
  if (duplicate) return;
  await Notification.create({
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    href: opts.href,
    read: false,
    emailSent: false,
  });
  if (opts.email && process.env.RESEND_API_KEY) {
    const user = await User.findById(opts.userId);
    if (user?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "Jira Project Tracker <noreply@example.com>",
        to: user.email,
        subject: opts.title,
        text: `${opts.body}\n${opts.href ? `${process.env.APP_URL ?? ""}${opts.href}` : ""}`,
      });
      await Notification.updateOne({ userId: opts.userId, title: opts.title }, { emailSent: true }).sort({
        createdAt: -1,
      });
    }
  }
}
