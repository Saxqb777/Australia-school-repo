import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { peerPairings, rubricAreas, teachers, workshopAttendees, workshops } from "@/db/schema";
import { workshopEffect, type WorkshopEffect } from "./analytics";
import type { ObservationFact } from "./queries";

export interface WorkshopView {
  id: string;
  title: string;
  areaId: number;
  areaName: string;
  date: string;
  time: string | null;
  location: string | null;
  status: "scheduled" | "completed" | "cancelled";
  leadTeacherId: string | null;
  leadName: string | null;
  criterionCodes: string[];
  attendees: { teacherId: string; name: string; attended: boolean | null; effect: WorkshopEffect | null }[];
}

/** Workshops with attendees and, once complete, whether each attendee's area level moved afterwards. */
export async function listWorkshops(demo: boolean, facts: ObservationFact[], teacherId?: string): Promise<WorkshopView[]> {
  const rows = await db
    .select({
      id: workshops.id,
      title: workshops.title,
      areaId: workshops.areaId,
      areaName: rubricAreas.name,
      date: workshops.date,
      time: workshops.time,
      location: workshops.location,
      status: workshops.status,
      leadTeacherId: workshops.leadTeacherId,
      criterionCodes: workshops.criterionCodes,
    })
    .from(workshops)
    .innerJoin(rubricAreas, eq(rubricAreas.id, workshops.areaId))
    .where(eq(workshops.isDemo, demo))
    .orderBy(desc(workshops.date));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [att, people] = await Promise.all([
    db.select().from(workshopAttendees).where(inArray(workshopAttendees.workshopId, ids)),
    db.select({ id: teachers.id, name: teachers.name }).from(teachers).orderBy(asc(teachers.name)),
  ]);
  const names = new Map(people.map((p) => [p.id, p.name]));
  const factsByTeacher = new Map<string, ObservationFact[]>();
  for (const f of facts) factsByTeacher.set(f.teacherId, [...(factsByTeacher.get(f.teacherId) ?? []), f]);
  const views = rows.map((r) => ({
    ...r,
    leadName: r.leadTeacherId ? (names.get(r.leadTeacherId) ?? null) : null,
    attendees: att
      .filter((a) => a.workshopId === r.id)
      .map((a) => ({
        teacherId: a.teacherId,
        name: names.get(a.teacherId) ?? "",
        attended: a.attended,
        effect: r.status === "completed" && a.attended ? workshopEffect(factsByTeacher.get(a.teacherId) ?? [], r.areaId, r.date) : null,
      }))
      .sort((x, y) => x.name.localeCompare(y.name)),
  }));
  if (!teacherId) return views;
  return views.filter((w) => w.leadTeacherId === teacherId || w.attendees.some((a) => a.teacherId === teacherId));
}

export async function listPairingsFor(demo: boolean, teacherId: string) {
  const rows = await db
    .select({
      id: peerPairings.id,
      teacherId: peerPairings.teacherId,
      partnerTeacherId: peerPairings.partnerTeacherId,
      areaName: rubricAreas.name,
      introducedAt: peerPairings.introducedAt,
    })
    .from(peerPairings)
    .innerJoin(rubricAreas, eq(rubricAreas.id, peerPairings.areaId))
    .where(eq(peerPairings.isDemo, demo));
  const people = await db.select({ id: teachers.id, name: teachers.name }).from(teachers);
  const names = new Map(people.map((p) => [p.id, p.name]));
  return rows
    .filter((r) => r.teacherId === teacherId || r.partnerTeacherId === teacherId)
    .map((r) => ({
      ...r,
      role: r.teacherId === teacherId ? ("supported" as const) : ("supporting" as const),
      otherName: names.get(r.teacherId === teacherId ? r.partnerTeacherId : r.teacherId) ?? "",
    }));
}
