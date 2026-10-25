import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { peerFiles, peerObservations } from "@/db/schema";
import { getMode } from "@/lib/mode";
import { getPeer } from "@/lib/peer";
import { canManage, getCurrentUser } from "@/lib/session";

const level = z.number().int().min(1).max(6);
const bodySchema = z.object({
  action: z.enum(["save", "confirm"]),
  observerTeacherId: z.uuid().nullable(),
  observerName: z.string().trim().max(120),
  teacherId: z.uuid().nullable(),
  teacherName: z.string().trim().max(120),
  className: z.string().trim().max(20).nullable(),
  subject: z.string().trim().max(60).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  period: z.number().int().min(0).max(12).nullable(),
  topic: z.string().trim().max(200).nullable(),
  ratings: z.record(z.string(), level),
  comments: z.record(z.string(), z.string().max(2000)),
  strengths: z.string().max(4000).nullable(),
  improvements: z.string().max(4000).nullable(),
  overallLevel: level.nullable(),
});

async function guard(id: string) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword || !canManage(user)) return { error: NextResponse.json({ ok: false, message: "Not allowed." }, { status: 403 }) };
  if (!z.uuid().safeParse(id).success) return { error: NextResponse.json({ ok: false, message: "Not found." }, { status: 404 }) };
  const peer = await getPeer(id, (await getMode()) === "demo");
  if (!peer) return { error: NextResponse.json({ ok: false, message: "Not found." }, { status: 404 }) };
  return { user, peer };
}

/** Save corrections, or confirm the record once it has been checked against the original. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard((await params).id);
  if ("error" in g) return g.error;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Some fields could not be read." }, { status: 400 });
  const { action, ...data } = parsed.data;
  if (action === "confirm") {
    if (!data.teacherId || !(data.observerTeacherId || data.observerName)) {
      return NextResponse.json({ ok: false, message: "Choose the teacher observed and the observer before confirming." }, { status: 422 });
    }
    if (Object.keys(data.ratings).length === 0) {
      return NextResponse.json({ ok: false, message: "Add at least one rating before confirming." }, { status: 422 });
    }
  }
  const now = new Date();
  await db
    .update(peerObservations)
    .set({
      ...data,
      updatedAt: now,
      ...(action === "confirm" ? { status: "confirmed" as const, confirmedAt: now, confirmedByUserId: g.user.id, uncertain: [] } : {}),
    })
    .where(eq(peerObservations.id, g.peer.id));
  return NextResponse.json({ ok: true, status: action === "confirm" ? "confirmed" : g.peer.status });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard((await params).id);
  if ("error" in g) return g.error;
  await db.delete(peerObservations).where(eq(peerObservations.id, g.peer.id));
  if (g.peer.fileId) await db.delete(peerFiles).where(eq(peerFiles.id, g.peer.fileId));
  return NextResponse.json({ ok: true });
}
