import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/performance";
import { markReadAction } from "@/lib/actions/notifications";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/dates";

export default async function NotificationsPage() {
  const user = await requireUser();
  await connectDB();
  const items = await Notification.find({ userId: user.id }).sort({ createdAt: -1 }).limit(50);
  return (
    <>
      <PageHeader title="Notifications" />
      <div className="grid gap-2">
        {!items.length ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : null}
        {items.map((n) => {
          const action = markReadAction.bind(null, String(n._id));
          return (
            <div key={String(n._id)} className="flex items-start justify-between rounded-xl border bg-card p-4">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(n.createdAt)}</p>
                {n.href ? (
                  <a className="text-sm text-primary hover:underline" href={n.href}>
                    Open
                  </a>
                ) : null}
              </div>
              {!n.read ? (
                <form action={action}>
                  <Button size="sm" variant="outline">
                    Mark read
                  </Button>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
