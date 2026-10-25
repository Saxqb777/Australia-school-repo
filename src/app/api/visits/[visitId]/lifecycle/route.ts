import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { feedbackDeliveries, notifications, observations, teacherReflections } from "@/db/schema";
import { jsonError, loadVisitContext } from "@/lib/api-guard";
import { markStep } from "@/lib/progress";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("share") }),
  z.object({ action: z.literal("unshare") }),
  z.object({ action: z.literal("sign_coordinator") }),
  z.object({ action: z.literal("sign_teacher") }),
  z.object({ action: z.literal("reflection"), text: z.string().trim().min(1).max(3000) }),
  z.object({ action: z.literal("delivered"), channel: z.enum(["copy", "pdf"]) }),
  z.object({ action: z.literal("opened") }),
]);

/** Sharing with the teacher, electronic signatures, the teacher's reflection, and delivery records. */
export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  const ctx = await loadVisitContext((await params).visitId);
  if (ctx instanceof NextResponse) return ctx;
  const { user, access, visit, state } = ctx;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Unknown action.");
  const body = parsed.data;
  const observationId = state.observationId;
  if (!observationId) return jsonError(400, "This observation has not started yet.");
  const now = new Date();
  const isDemo = visit.cycleIsDemo;

  if (body.action === "share" || body.action === "unshare" || body.action === "sign_coordinator") {
    if (access !== "edit") return jsonError(403, "Only the assigned observer can do this.");
    if (state.status !== "complete") return jsonError(409, "Mark the observation complete first.");
    if (body.action === "share") {
      await db.update(observations).set({ sharedAt: now }).where(eq(observations.id, observationId));
      await db.insert(feedbackDeliveries).values({ observationId, channel: "portal", sentByUserId: user.id });
      await markStep(user, "share");
      if (visit.teacherUserId) {
        await db.insert(notifications).values({
          userId: visit.teacherUserId,
          title: "New lesson feedback",
          body: `${visit.observerName} has shared feedback on your ${visit.subject} lesson with ${visit.className}.`,
          href: `/my/${visit.id}`,
          isDemo,
        });
      }
      return NextResponse.json({ ok: true, sharedAt: now.toISOString() });
    }
    if (body.action === "unshare") {
      if (state.signedByTeacherAt) return jsonError(409, "The teacher has already signed this observation.");
      await db.update(observations).set({ sharedAt: null }).where(eq(observations.id, observationId));
      return NextResponse.json({ ok: true });
    }
    await db
      .update(observations)
      .set({ signedByCoordinatorAt: now, signedByCoordinatorName: visit.observerName })
      .where(eq(observations.id, observationId));
    await markStep(user, "sign");
    return NextResponse.json({ ok: true, signedAt: now.toISOString(), name: visit.observerName });
  }

  if (body.action === "delivered") {
    if (access === "none") return jsonError(403, "Not allowed.");
    await db.insert(feedbackDeliveries).values({ observationId, channel: body.channel, sentByUserId: user.id });
    return NextResponse.json({ ok: true });
  }

  // Teacher actions
  if (access !== "teacher") return jsonError(403, "Only the observed teacher can do this.");
  if (body.action === "opened") {
    await db
      .update(feedbackDeliveries)
      .set({ openedAt: now })
      .where(
        and(
          eq(feedbackDeliveries.observationId, observationId),
          eq(feedbackDeliveries.channel, "portal"),
          isNull(feedbackDeliveries.openedAt),
        ),
      );
    await markStep(user, "open");
    return NextResponse.json({ ok: true });
  }
  if (body.action === "sign_teacher") {
    await db
      .update(observations)
      .set({ signedByTeacherAt: now, signedByTeacherName: visit.teacherName })
      .where(eq(observations.id, observationId));
    await markStep(user, "sign-teacher");
    if (visit.observerUserId) {
      await db.insert(notifications).values({
        userId: visit.observerUserId,
        title: "Observation signed",
        body: `${visit.teacherName} has signed the observation of their ${visit.subject} lesson.`,
        href: `/observe/${visit.id}`,
        isDemo,
      });
    }
    return NextResponse.json({ ok: true, signedAt: now.toISOString(), name: visit.teacherName });
  }
  // reflection
  if (!visit.teacherId) return jsonError(400, "No teacher on this visit.");
  await db
    .insert(teacherReflections)
    .values({ observationId, teacherId: visit.teacherId, text: body.text })
    .onConflictDoUpdate({ target: teacherReflections.observationId, set: { text: body.text, updatedAt: now } });
  await markStep(user, "reflect");
  if (visit.observerUserId) {
    await db.insert(notifications).values({
      userId: visit.observerUserId,
      title: "Reflection from a teacher",
      body: `${visit.teacherName} replied to your feedback.`,
      href: `/observe/${visit.id}#reflection`,
      isDemo,
    });
  }
  return NextResponse.json({ ok: true, updatedAt: now.toISOString() });
}
