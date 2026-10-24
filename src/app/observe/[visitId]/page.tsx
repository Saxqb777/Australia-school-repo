import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { GuidedTour } from "@/components/GuidedTour";
import { ObservationForm } from "@/components/observe/ObservationForm";
import { visitAccess } from "@/lib/access";
import { fullDate } from "@/lib/dates";
import { getObservationState, getPreviousObservation, getRubric, getVisit } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { OBSERVE_TOUR } from "@/lib/tours";

export const metadata: Metadata = { title: "Observation" };

export default async function ObservePage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const user = await requireUser(["OBSERVER", "ADMIN"]);
  if (!z.uuid().safeParse(visitId).success) notFound();
  const access = await visitAccess(user, visitId);
  if (access === "none") notFound();
  const visit = await getVisit(visitId);
  if (!visit) notFound();
  const [rubric, state] = await Promise.all([getRubric(), getObservationState(visit)]);
  const previous = await getPreviousObservation(visit, rubric, user);
  const readOnly = access !== "edit";

  return (
    <main>
      <ObservationForm
        visit={visit}
        visitDateLabel={fullDate(visit.date)}
        rubric={rubric}
        initial={state}
        readOnly={readOnly}
        previous={previous}
        backHref={user.role === "ADMIN" && readOnly ? "/admin" : "/visits"}
      />
      {!readOnly ? (
        <GuidedTour tourKey="observe" steps={OBSERVE_TOUR} autoStart={!user.toursCompleted.includes("observe")} />
      ) : null}
    </main>
  );
}
