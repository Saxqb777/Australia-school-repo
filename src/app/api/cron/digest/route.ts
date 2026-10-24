import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { saveDigest, weekStartOf } from "@/lib/digest";
import { getMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

/** Runs every Friday (Vercel cron). Stores the week's summary and tells the administrator in the app. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const demo = (await getMode()) === "demo";
  const row = await saveDigest(demo, weekStartOf(new Date()));
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN"));
  if (row && admins.length > 0) {
    await db.insert(notifications).values(
      admins.map((a) => ({
        userId: a.id,
        title: "Friday summary is ready",
        body: `${row.payload.visitsDone} visits done this week, ${row.payload.visitsOutstanding} outstanding.`,
        href: "/admin#digest",
        isDemo: demo,
      })),
    );
  }
  return NextResponse.json({ ok: true });
}
