import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { observations, visits } from "@/db/schema";

export type ObservationRow = typeof observations.$inferSelect;

/** Creates the observation for a visit on its first save, prefilled from the schedule. */
export async function ensureObservation(visitId: string): Promise<ObservationRow> {
  const existing = await db.query.observations.findFirst({ where: eq(observations.visitId, visitId) });
  if (existing) return existing;
  const visit = await db.query.visits.findFirst({ where: eq(visits.id, visitId) });
  if (!visit) throw new Error("Visit not found");
  await db
    .insert(observations)
    .values({ visitId, observedDate: visit.date, subject: visit.subject })
    .onConflictDoNothing();
  const created = await db.query.observations.findFirst({ where: eq(observations.visitId, visitId) });
  if (!created) throw new Error("Could not create observation");
  return created;
}
