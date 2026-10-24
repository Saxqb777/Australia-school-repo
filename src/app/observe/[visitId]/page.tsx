import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { GuidedTour } from "@/components/GuidedTour";
import { ObservationForm } from "@/components/observe/ObservationForm";
import { db } from "@/db";
import { feedbackDeliveries } from "@/db/schema";
import { visitAccess } from "@/lib/access";
import { fullDate } from "@/lib/dates";
import { getMode } from "@/lib/mode";
import { getObservationState, getPreviousObservation, getRubric, getVisit } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { OBSERVE_TOUR } from "@/lib/tours";

export const metadata: Metadata = { title: "Observation" };

export default async function ObservePage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const user = await requireUser();
  if (!z.uuid().safeParse(visitId).success) notFound();
  const access = await visitAccess(user, visitId);
  if (access === "teacher") redirect(`/my/${visitId}`);
  if (access === "none") notFound();
  const visit = await getVisit(visitId);
  if (!visit) notFound();
  const [rubric, state] = await Promise.all([getRubric(), getObservationState(visit)]);
  const previous = await getPreviousObservation(visit, rubric, user);
  const readOnly = access !== "edit";
  const opened = state.observationId
    ? await db.query.feedbackDeliveries.findFirst({
        where: and(eq(feedbackDeliveries.observationId, state.observationId), eq(feedbackDeliveries.channel, "portal")),
        orderBy: desc(feedbackDeliveries.sentAt),
        columns: { openedAt: true },
      })
    : undefined;
  const demo = (await getMode()) === "demo";

  return (
    <main>
      {demo ? (
        <div className="border-b border-dashed border-navy bg-navy-wash px-4 py-1.5 text-center text-xs text-ink">
          <span className="font-semibold text-navy">DEMO</span> · Sample ratings using real staff names. Not a real judgement.
        </div>
      ) : null}
      <ObservationForm
        visit={visit}
        visitDateLabel={fullDate(visit.date)}
        rubric={rubric}
        initial={state}
        readOnly={readOnly}
        previous={previous}
        backHref={user.role === "ADMIN" && readOnly ? "/admin" : "/visits"}
        shareInfo={{
          sharedAt: state.sharedAt,
          openedAt: opened?.openedAt?.toISOString() ?? null,
          signedByTeacherAt: state.signedByTeacherAt,
          signedByTeacherName: state.signedByTeacherName,
          signedByCoordinatorAt: state.signedByCoordinatorAt,
          signedByCoordinatorName: state.signedByCoordinatorName,
          reflection: state.reflection,
        }}
      />
      {!readOnly ? (
        <GuidedTour tourKey="observe" steps={OBSERVE_TOUR} autoStart={!user.toursCompleted.includes("observe")} />
      ) : null}
    </main>
  );
}
