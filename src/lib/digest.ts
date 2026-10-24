import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { digests, observationCycles, observations, teachers, visits, type DigestPayload } from "@/db/schema";
import { criterionMeans } from "./analytics";
import { getRubric, loadFacts } from "./queries";

/** Monday of the week containing the given date (UTC dates, school week Monday to Friday). */
export function weekStartOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The Friday summary: visits done and outstanding this week, and the strongest and weakest criteria. */
export async function buildDigest(demo: boolean, weekStart: string): Promise<DigestPayload> {
  const weekEnd = addDays(weekStart, 4);
  const rows = await db
    .select({
      date: visits.date,
      teacher: teachers.name,
      observer: visits.observerName,
      observerUserId: visits.observerUserId,
      status: observations.status,
    })
    .from(visits)
    .innerJoin(observationCycles, eq(observationCycles.id, visits.cycleId))
    .innerJoin(teachers, eq(teachers.id, visits.teacherId))
    .leftJoin(observations, eq(observations.visitId, visits.id))
    .where(and(eq(observationCycles.isDemo, demo), gte(visits.date, weekStart), lte(visits.date, weekEnd)));
  // Only visits that someone with a login can record count as outstanding.
  const recordable = rows.filter((r) => r.observerUserId !== null);
  const done = recordable.filter((r) => r.status === "complete");
  const outstanding = recordable.filter((r) => r.status !== "complete");
  const rubric = await getRubric();
  const facts = (await loadFacts(rubric, { demo })).filter((f) => f.date >= weekStart && f.date <= weekEnd);
  const criteria = rubric.flatMap((a) => a.criteria);
  const means = criterionMeans(facts, criteria.map((c) => c.id));
  const ranked = criteria
    .map((c) => ({ code: c.code, name: c.name, mean: means.get(c.id) ?? null }))
    .filter((c): c is { code: string; name: string; mean: number } => c.mean !== null)
    .map((c) => ({ ...c, mean: Number(c.mean.toFixed(2)) }));
  return {
    weekStart,
    weekEnd,
    visitsDone: done.length,
    visitsOutstanding: outstanding.length,
    outstandingList: outstanding.map((r) => ({ teacher: r.teacher, observer: r.observer, date: r.date })),
    topStrengths: [...ranked].sort((a, b) => a.mean - b.mean).slice(0, 3),
    topConcerns: [...ranked].sort((a, b) => b.mean - a.mean).slice(0, 3),
  };
}

export async function saveDigest(demo: boolean, weekStart: string) {
  const payload = await buildDigest(demo, weekStart);
  const [row] = await db.insert(digests).values({ weekStart, payload, isDemo: demo }).returning();
  return row;
}
