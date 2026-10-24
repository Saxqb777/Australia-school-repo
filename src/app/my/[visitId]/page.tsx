import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { visitAccess } from "@/lib/access";
import { fullDate } from "@/lib/dates";
import { getObservationState, getRubric, getVisit, judgementFor } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { TeacherFeedback } from "./TeacherFeedback";

export const metadata: Metadata = { title: "Lesson feedback" };

export default async function TeacherObservationPage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const user = await requireUser(["TEACHER"]);
  if (!z.uuid().safeParse(visitId).success) notFound();
  if ((await visitAccess(user, visitId)) !== "teacher") notFound();
  const visit = await getVisit(visitId);
  if (!visit) notFound();
  const [rubric, state] = await Promise.all([getRubric(), getObservationState(visit)]);
  const j = judgementFor(rubric, state);
  return (
    <AppShell user={user} active="my">
      <TeacherFeedback
        visitId={visit.id}
        observerName={visit.observerName}
        lessonLabel={`${state.header.subject || visit.subject} · ${visit.className}${state.header.topic ? ` · ${state.header.topic}` : ""}`}
        dateLabel={fullDate(state.header.observedDate || visit.date)}
        overall={j.overallEffective}
        areas={rubric.map((a, i) => ({ id: a.id, label: a.judgementLabel, level: j.areas[i]?.effective ?? null }))}
        criteria={rubric.flatMap((a) =>
          a.criteria.map((c) => {
            const r = state.ratings[c.id];
            return {
              id: c.id,
              code: c.code,
              name: c.name,
              level: r?.level ?? null,
              descriptor: r?.level ? c.descriptors[r.level] : "",
              comment: r?.comment ?? "",
            };
          }),
        )}
        english={{ strengths: state.strengths, improvements: state.improvements, feedback: state.feedback }}
        signedAt={state.signedByTeacherAt}
        reflection={state.reflection?.text ?? ""}
      />
    </AppShell>
  );
}
