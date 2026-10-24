import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AppShell, PageHeading } from "@/components/AppShell";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getMode } from "@/lib/mode";
import { getCurrentUser, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Notifications" };

async function markAllRead(): Promise<void> {
  "use server";
  const user = await getCurrentUser();
  if (!user) return;
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath("/notifications");
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const demo = (await getMode()) === "demo";
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.isDemo, demo)))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
  const unread = rows.filter((r) => !r.readAt).length;
  return (
    <AppShell user={user} active="notifications">
      <PageHeading eyebrow="In-app notices" title="Notifications">
        {unread > 0 ? (
          <form action={markAllRead}>
            <button type="submit" className="btn btn-quiet !min-h-9 !text-sm">
              Mark all as read
            </button>
          </form>
        ) : null}
      </PageHeading>
      {rows.length === 0 ? (
        <p className="mt-8 max-w-xl border-l-2 border-navy pl-4 leading-relaxed text-ink-soft">
          Nothing yet. Shared feedback, signatures, reflections, workshop invitations and colleague introductions appear
          here, so nothing depends on email.
        </p>
      ) : (
        <ul className="mt-6 border-t border-rule">
          {rows.map((n) => (
            <li key={n.id} className={`border-b border-rule ${n.readAt ? "" : "bg-sheet"}`}>
              <div className="flex gap-3 px-2 py-3.5">
                <span aria-hidden className={`mt-1.5 size-2 shrink-0 ${n.readAt ? "border border-rule-strong" : "bg-navy"}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {n.href ? (
                      <Link href={n.href} className="hover:underline">
                        {n.title}
                      </Link>
                    ) : (
                      n.title
                    )}
                    {!n.readAt ? <span className="sr-only"> (unread)</span> : null}
                  </p>
                  <p className="text-sm leading-relaxed text-ink-soft">{n.body}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {n.createdAt.toLocaleString("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
