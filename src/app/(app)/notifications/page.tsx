import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/performance";
import { markReadAction } from "@/lib/actions/notifications";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtDate } from "@/lib/dates";

export default async function NotificationsPage() {
  const user = await requireUser();
  await connectDB();
  const items = await Notification.find({ userId: user.id }).sort({ createdAt: -1 }).limit(50);
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Operational alerts for overdue work, reviews, and data quality. Mark items read after you act."
      />
      {!items.length ? (
        <EmptyState
          title="No notifications yet"
          description="Alerts appear here when work is overdue, a deliverable needs review, or a report is late."
        />
      ) : (
        <div className="grid gap-2">
          {items.map((n) => {
            const action = markReadAction.bind(null, String(n._id));
            return (
              <div key={String(n._id)} className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-body text-muted-foreground">{n.body}</p>
                  <p className="text-caption">{fmtDate(n.createdAt)}</p>
                  {n.href ? (
                    <a className="text-sm text-primary hover:underline" href={n.href}>
                      Open
                    </a>
                  ) : null}
                </div>
                {!n.read ? (
                  <form action={action}>
                    <Button type="submit" size="sm" variant="outline">
                      Mark read
                    </Button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
