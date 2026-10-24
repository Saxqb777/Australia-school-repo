import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { observations } from "@/db/schema";
import { visitAccess } from "@/lib/access";
import { completenessIssues } from "@/lib/completeness";
import { getObservationState, getRubric, getVisit } from "@/lib/queries";
import type { SaveError } from "@/lib/save-ops";
import { getCurrentUser } from "@/lib/session";

const bodySchema = z.object({ action: z.enum(["complete", "reopen"]) });

function fail(status: number, code: SaveError["code"], message: string) {
  return NextResponse.json<SaveError>({ ok: false, code, message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return fail(401, "unauthorised", "Sign in again to continue.");
  if (!z.uuid().safeParse(visitId).success) return fail(404, "not_found", "This visit does not exist.");
  const access = await visitAccess(user, visitId);
  if (access === "none") return fail(404, "not_found", "This visit does not exist.");
  if (access !== "edit") return fail(403, "forbidden", "Only the assigned observer can change this observation.");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid", "Unknown action.");

  const visit = await getVisit(visitId);
  if (!visit) return fail(404, "not_found", "This visit does not exist.");
  const state = await getObservationState(visit);
  if (!state.observationId) return fail(400, "invalid", "Rate the lesson before marking it complete.");

  if (parsed.data.action === "reopen") {
    await db
      .update(observations)
      .set({ status: "draft", completedAt: null, updatedAt: new Date() })
      .where(eq(observations.id, state.observationId));
    return NextResponse.json({ ok: true, status: "draft" });
  }

  const rubric = await getRubric();
  const issues = completenessIssues({
    header: state.header,
    criteria: rubric.flatMap((a) => a.criteria),
    ratedCriterionIds: new Set(
      Object.entries(state.ratings)
        .filter(([, r]) => r.level !== null)
        .map(([id]) => Number(id)),
    ),
    areaOverrides: rubric.map((a) => ({
      areaName: a.name,
      level: state.areaOverrides[a.id]?.level ?? null,
      reason: state.areaOverrides[a.id]?.reason ?? "",
    })),
    overallOverride: state.overall,
  });
  if (issues.length > 0) {
    return NextResponse.json(
      { ok: false, code: "invalid", message: "Some parts of the form still need filling in.", issues },
      { status: 422 },
    );
  }
  const completedAt = new Date();
  await db
    .update(observations)
    .set({ status: "complete", completedAt, updatedAt: completedAt })
    .where(eq(observations.id, state.observationId));
  return NextResponse.json({ ok: true, status: "complete", completedAt: completedAt.toISOString() });
}
