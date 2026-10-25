import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { observations } from "@/db/schema";
import { SummaryUnavailableError, writeSummary } from "@/lib/ai/summary";
import { jsonError, loadVisitContext } from "@/lib/api-guard";
import { markStep } from "@/lib/progress";
import { getRubric, judgementFor } from "@/lib/queries";

export const maxDuration = 120;

/** Drafts Areas of Strength, Suggested Areas for Improvement and the feedback message from the saved ratings. */
export async function POST(_request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  const ctx = await loadVisitContext((await params).visitId);
  if (ctx instanceof NextResponse) return ctx;
  const { user, access, visit, state } = ctx;
  if (access !== "edit") return jsonError(403, "Only the assigned observer can write the summary.");
  if (state.status === "complete") return jsonError(409, "This observation is marked complete. Reopen it to make changes.");
  if (!state.observationId) return jsonError(400, "Rate the lesson first; the summary is written from the ratings.");
  const rated = Object.values(state.ratings).filter((r) => r.level !== null).length;
  if (rated < 10) return jsonError(400, `Rate at least 10 criteria first (${rated} rated so far).`);

  const rubric = await getRubric();
  const j = judgementFor(rubric, state);
  try {
    const result = await writeSummary({
      teacherName: visit.teacherName,
      observerName: visit.observerName,
      className: visit.className,
      subject: state.header.subject || visit.subject,
      topic: state.header.topic,
      rubric,
      ratings: state.ratings,
      areaLevels: new Map(j.areas.map((a) => [a.areaId, a.effective])),
      overall: j.overallEffective,
    });
    await db.update(observations).set({ summaryGeneratedAt: new Date() }).where(eq(observations.id, state.observationId));
    await markStep(user, "summary");
    return NextResponse.json({
      ok: true,
      strengths: result.draft.strengths.join("\n"),
      improvements: result.draft.improvements.join("\n"),
      feedback: result.draft.letter,
      problems: result.problems,
    });
  } catch (error) {
    if (error instanceof SummaryUnavailableError) return jsonError(503, error.message);
    console.error("summary failed", error);
    return jsonError(502, "The AI could not be reached. Your ratings are safe; try again in a minute.");
  }
}
