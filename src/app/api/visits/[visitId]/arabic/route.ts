import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { observations } from "@/db/schema";
import { SummaryUnavailableError, translateToArabic } from "@/lib/ai/summary";
import { jsonError, loadVisitContext } from "@/lib/api-guard";

export const maxDuration = 120;

/** Arabic version of the teacher-facing feedback, translated once and reused until the English changes. */
export async function POST(_request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  const ctx = await loadVisitContext((await params).visitId);
  if (ctx instanceof NextResponse) return ctx;
  const { access, state } = ctx;
  if (access === "none" || !state.observationId) return jsonError(404, "Not found.");
  const source = { strengths: state.strengths, improvements: state.improvements, feedback: state.feedback };
  const sourceHash = createHash("sha256").update(JSON.stringify(source)).digest("hex");
  const row = await db.query.observations.findFirst({
    where: eq(observations.id, state.observationId),
    columns: { arabicCache: true },
  });
  if (row?.arabicCache?.sourceHash === sourceHash) return NextResponse.json({ ok: true, ...row.arabicCache });
  try {
    const ar = await translateToArabic(source);
    const cache = { sourceHash, ...ar };
    await db.update(observations).set({ arabicCache: cache }).where(eq(observations.id, state.observationId));
    return NextResponse.json({ ok: true, ...cache });
  } catch (error) {
    if (error instanceof SummaryUnavailableError) return jsonError(503, error.message);
    console.error("translation failed", error);
    return jsonError(502, "The translation could not be made right now. Try again in a minute.");
  }
}
