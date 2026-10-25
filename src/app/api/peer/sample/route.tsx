import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import type { Level } from "@/lib/judgement";
import { ObservationPdf } from "@/lib/pdf/ObservationPdf";
import { getMode } from "@/lib/mode";
import { emptyState, getRubric, judgementFor, type VisitSummary } from "@/lib/queries";
import { canManage, getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Demo only: a completed form, as a peer observer would hand it in, to try the upload with. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canManage(user)) return new Response("Not allowed.", { status: 403 });
  if ((await getMode()) !== "demo") return new Response("The sample form is only available in the demo.", { status: 404 });
  const rubric = await getRubric();
  const visit: VisitSummary = {
    id: "sample",
    cycleId: "sample",
    teacherId: "sample",
    teacherName: "Ms. Irimia",
    teacherUserId: null,
    observerName: "Ms. Cornelia",
    observerUserId: null,
    className: "KG2C",
    subject: "English",
    date: "2026-11-02",
    period: 1,
    cycleLabel: "Term 1, Week 10",
    cycleStart: "2026-11-02",
    cycleEnd: "2026-11-06",
    cycleIsDemo: true,
  };
  const state = emptyState(visit);
  const pattern: Level[] = [2, 3, 2, 4, 3, 3, 2, 3, 4, 3, 3, 3, 4, 3, 2, 3, 3, 2, 3, 3];
  rubric
    .flatMap((a) => a.criteria)
    .forEach((c, i) => {
      state.ratings[c.id] = { level: pattern[i % pattern.length] ?? 3, comment: i === 3 ? "Most children did the same task; a few finished early." : "" };
    });
  state.header = { ...state.header, time: "07:45", lengthOfObservation: "35 minutes", topic: "Sounds and letters", numberOnRoll: "20", numberPresent: "19" };
  state.strengths = "Warm, calm routines.\nClear modelling of letter sounds.\nChildren eager to answer.";
  state.improvements = "Offer a harder task for early finishers.\nCheck understanding of quieter children.";
  const buffer = await renderToBuffer(
    <ObservationPdf
      visit={visit}
      state={state}
      rubric={rubric}
      judgement={judgementFor(rubric, state)}
      crestPath={path.join(process.cwd(), "public", "crest.png")}
      dateLabel="Monday, 2 November 2026"
    />,
  );
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Sample-peer-observation-Ms-Irimia.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
