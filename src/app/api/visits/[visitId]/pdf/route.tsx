import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { jsonError, loadVisitContext } from "@/lib/api-guard";
import { fullDate } from "@/lib/dates";
import { ObservationPdf } from "@/lib/pdf/ObservationPdf";
import { getRubric, judgementFor } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The observation laid out as the school's Teacher Observation Form. */
export async function GET(_request: Request, { params }: { params: Promise<{ visitId: string }> }) {
  const ctx = await loadVisitContext((await params).visitId);
  if (ctx instanceof NextResponse) return ctx;
  const { visit, state } = ctx;
  if (!state.observationId) return jsonError(404, "This observation has not started yet.");
  const rubric = await getRubric();
  const buffer = await renderToBuffer(
    <ObservationPdf
      visit={visit}
      state={state}
      rubric={rubric}
      judgement={judgementFor(rubric, state)}
      crestPath={path.join(process.cwd(), "public", "crest.png")}
      dateLabel={fullDate(state.header.observedDate || visit.date)}
    />,
  );
  const safe = visit.teacherName.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Observation-${safe}-${state.header.observedDate || visit.date}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
