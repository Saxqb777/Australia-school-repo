import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

const bodySchema = z.object({ tour: z.enum(["visits", "observe", "admin", "teacher"]) });

/** Records that the signed-in user finished or skipped a guided tour, so it doesn't start on its own again. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  if (!user.toursCompleted.includes(parsed.data.tour)) {
    await db
      .update(users)
      .set({ toursCompleted: sql`array_append(${users.toursCompleted}, ${parsed.data.tour})` })
      .where(eq(users.id, user.id));
  }
  return NextResponse.json({ ok: true });
}
