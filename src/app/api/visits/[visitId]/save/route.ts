import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { areaJudgements, observationRatings, observations, rubricAreas, rubricCriteria } from "@/db/schema";
import { visitAccess } from "@/lib/access";
import { ensureObservation } from "@/lib/observations";
import { HEADER_FIELDS, type HeaderField, type SaveError, type SaveResponse } from "@/lib/save-ops";
import { getCurrentUser } from "@/lib/session";

const ts = z.number().int().positive();
const level = z.number().int().min(1).max(6).nullable();
const opSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("header"), field: z.enum(HEADER_FIELDS), value: z.string().max(500), ts }),
  z.object({ kind: z.literal("rating"), criterionId: z.number().int(), level, ts }),
  z.object({ kind: z.literal("comment"), criterionId: z.number().int(), comment: z.string().max(4000), ts }),
  z.object({ kind: z.literal("area"), areaId: z.number().int(), level, reason: z.string().max(2000), ts }),
  z.object({ kind: z.literal("overall"), level, reason: z.string().max(2000), ts }),
]);
const bodySchema = z.object({ ops: z.array(opSchema).max(300) });

function fail(status: number, code: SaveError["code"], message: string) {
  return NextResponse.json<SaveError>({ ok: false, code, message }, { status });
}

type HeaderColumnValue = string | number | null;

function headerColumnValue(field: HeaderField, raw: string): HeaderColumnValue | undefined {
  const value = raw.trim();
  if (field === "numberOnRoll" || field === "numberPresent") {
    if (value === "") return null;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n <= 500 ? n : undefined;
  }
  if (field === "observedDate") {
    if (value === "") return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
  }
  return value === "" ? null : raw;
}

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return fail(401, "unauthorised", "Sign in again to keep saving.");
  if (!z.uuid().safeParse(visitId).success) return fail(404, "not_found", "This visit does not exist.");
  const access = await visitAccess(user, visitId);
  if (access === "none") return fail(404, "not_found", "This visit does not exist.");
  if (access !== "edit") return fail(403, "forbidden", "Only the assigned observer can change this observation.");

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid", "The changes could not be read.");

  const observation = await ensureObservation(visitId);
  if (observation.status === "complete") {
    return fail(409, "complete", "This observation is marked complete. Reopen it to make changes.");
  }

  const [criteriaRows, areaRows] = await Promise.all([
    db.select({ id: rubricCriteria.id }).from(rubricCriteria),
    db.select({ id: rubricAreas.id }).from(rubricAreas),
  ]);
  const criterionIds = new Set(criteriaRows.map((r) => r.id));
  const areaIds = new Set(areaRows.map((r) => r.id));

  const clock: Record<string, number> = { ...observation.fieldClock };
  const headerUpdates: Partial<Record<HeaderField, HeaderColumnValue>> = {};
  let overallUpdate: { level: number | null; reason: string | null } | null = null;

  for (const op of parsed.data.ops) {
    if (op.kind === "header") {
      if ((clock[op.field] ?? 0) >= op.ts) continue;
      const value = headerColumnValue(op.field, op.value);
      if (value === undefined) continue;
      headerUpdates[op.field] = value;
      clock[op.field] = op.ts;
    } else if (op.kind === "overall") {
      if ((clock.overall ?? 0) >= op.ts) continue;
      overallUpdate = { level: op.level, reason: op.level === null ? null : op.reason.trim() || null };
      clock.overall = op.ts;
    } else if (op.kind === "rating") {
      if (!criterionIds.has(op.criterionId)) continue;
      const at = new Date(op.ts);
      await db
        .insert(observationRatings)
        .values({ observationId: observation.id, criterionId: op.criterionId, level: op.level, levelClientTs: at })
        .onConflictDoUpdate({
          target: [observationRatings.observationId, observationRatings.criterionId],
          set: { level: op.level, levelClientTs: at, updatedAt: new Date() },
          setWhere: sql`${observationRatings.levelClientTs} is null or ${observationRatings.levelClientTs} < excluded.level_client_ts`,
        });
    } else if (op.kind === "comment") {
      if (!criterionIds.has(op.criterionId)) continue;
      const at = new Date(op.ts);
      const comment = op.comment.trim() === "" ? null : op.comment;
      await db
        .insert(observationRatings)
        .values({ observationId: observation.id, criterionId: op.criterionId, comment, commentClientTs: at })
        .onConflictDoUpdate({
          target: [observationRatings.observationId, observationRatings.criterionId],
          set: { comment, commentClientTs: at, updatedAt: new Date() },
          setWhere: sql`${observationRatings.commentClientTs} is null or ${observationRatings.commentClientTs} < excluded.comment_client_ts`,
        });
    } else {
      if (!areaIds.has(op.areaId)) continue;
      const at = new Date(op.ts);
      const reason = op.level === null ? null : op.reason.trim() || null;
      await db
        .insert(areaJudgements)
        .values({ observationId: observation.id, areaId: op.areaId, overrideLevel: op.level, reason, clientTs: at })
        .onConflictDoUpdate({
          target: [areaJudgements.observationId, areaJudgements.areaId],
          set: { overrideLevel: op.level, reason, clientTs: at, updatedAt: new Date() },
          setWhere: sql`${areaJudgements.clientTs} is null or ${areaJudgements.clientTs} < excluded.client_ts`,
        });
    }
  }

  const now = new Date();
  await db
    .update(observations)
    .set({
      ...headerUpdates,
      ...(overallUpdate
        ? { overallOverrideLevel: overallUpdate.level, overallOverrideReason: overallUpdate.reason }
        : {}),
      fieldClock: clock,
      updatedAt: now,
    })
    .where(and(eq(observations.id, observation.id), eq(observations.status, "draft")));

  return NextResponse.json<SaveResponse>({ ok: true, savedAt: now.toISOString(), status: "draft" });
}
