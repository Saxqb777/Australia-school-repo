import "server-only";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  areaJudgements,
  observationCycles,
  observationRatings,
  observations,
  rubricAreas,
  rubricCriteria,
  rubricDescriptors,
  teachers,
  users,
  visits,
} from "@/db/schema";
import { computeJudgement, isLevel, type Level, type LessonJudgement } from "./judgement";
import type { HeaderValues } from "./save-ops";

export interface RubricCriterion {
  id: number;
  code: string;
  name: string;
  descriptors: Record<Level, string>;
}

export interface RubricArea {
  id: number;
  position: number;
  name: string;
  judgementLabel: string;
  criteria: RubricCriterion[];
}

export async function getRubric(): Promise<RubricArea[]> {
  const [areas, criteria, descriptors] = await Promise.all([
    db.select().from(rubricAreas).orderBy(asc(rubricAreas.position)),
    db.select().from(rubricCriteria).orderBy(asc(rubricCriteria.areaId), asc(rubricCriteria.position)),
    db.select().from(rubricDescriptors),
  ]);
  const byCriterion = new Map<number, Record<Level, string>>();
  for (const d of descriptors) {
    if (!isLevel(d.level)) continue;
    const entry = byCriterion.get(d.criterionId) ?? ({} as Record<Level, string>);
    entry[d.level] = d.text;
    byCriterion.set(d.criterionId, entry);
  }
  return areas.map((a) => ({
    id: a.id,
    position: a.position,
    name: a.name,
    judgementLabel: a.judgementLabel,
    criteria: criteria
      .filter((c) => c.areaId === a.id)
      .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        descriptors: byCriterion.get(c.id) ?? ({} as Record<Level, string>),
      })),
  }));
}

export interface ObservationState {
  observationId: string | null;
  status: "draft" | "complete";
  completedAt: string | null;
  header: HeaderValues;
  ratings: Record<number, { level: Level | null; comment: string }>;
  areaOverrides: Record<number, { level: Level | null; reason: string }>;
  overall: { level: Level | null; reason: string };
}

export interface VisitSummary {
  id: string;
  teacherId: string;
  teacherName: string;
  observerName: string;
  observerUserId: string | null;
  className: string;
  subject: string;
  date: string;
  period: number;
  cycleLabel: string;
  cycleStart: string;
  cycleEnd: string;
}

export async function getVisit(visitId: string): Promise<VisitSummary | null> {
  const [row] = await db
    .select({
      id: visits.id,
      teacherId: visits.teacherId,
      teacherName: teachers.name,
      observerName: visits.observerName,
      observerUserId: visits.observerUserId,
      className: visits.className,
      subject: visits.subject,
      date: visits.date,
      period: visits.period,
      cycleLabel: observationCycles.label,
      cycleStart: observationCycles.startDate,
      cycleEnd: observationCycles.endDate,
    })
    .from(visits)
    .innerJoin(teachers, eq(teachers.id, visits.teacherId))
    .innerJoin(observationCycles, eq(observationCycles.id, visits.cycleId))
    .where(eq(visits.id, visitId))
    .limit(1);
  return row ?? null;
}

const str = (v: string | number | null | undefined): string => (v === null || v === undefined ? "" : String(v));

export async function getObservationState(visit: VisitSummary): Promise<ObservationState> {
  const observation = await db.query.observations.findFirst({ where: eq(observations.visitId, visit.id) });
  if (!observation) {
    return {
      observationId: null,
      status: "draft",
      completedAt: null,
      header: {
        observedDate: visit.date,
        time: "",
        lengthOfObservation: "",
        title: "",
        subject: visit.subject,
        topic: "",
        numberOnRoll: "",
        numberPresent: "",
      },
      ratings: {},
      areaOverrides: {},
      overall: { level: null, reason: "" },
    };
  }
  const [ratingRows, areaRows] = await Promise.all([
    db.select().from(observationRatings).where(eq(observationRatings.observationId, observation.id)),
    db.select().from(areaJudgements).where(eq(areaJudgements.observationId, observation.id)),
  ]);
  const ratings: ObservationState["ratings"] = {};
  for (const r of ratingRows) {
    ratings[r.criterionId] = { level: isLevel(r.level) ? r.level : null, comment: r.comment ?? "" };
  }
  const areaOverrides: ObservationState["areaOverrides"] = {};
  for (const a of areaRows) {
    areaOverrides[a.areaId] = { level: isLevel(a.overrideLevel) ? a.overrideLevel : null, reason: a.reason ?? "" };
  }
  return {
    observationId: observation.id,
    status: observation.status,
    completedAt: observation.completedAt?.toISOString() ?? null,
    header: {
      observedDate: str(observation.observedDate),
      time: str(observation.time),
      lengthOfObservation: str(observation.lengthOfObservation),
      title: str(observation.title),
      subject: str(observation.subject),
      topic: str(observation.topic),
      numberOnRoll: str(observation.numberOnRoll),
      numberPresent: str(observation.numberPresent),
    },
    ratings,
    areaOverrides,
    overall: {
      level: isLevel(observation.overallOverrideLevel) ? observation.overallOverrideLevel : null,
      reason: observation.overallOverrideReason ?? "",
    },
  };
}

export function judgementFor(rubric: RubricArea[], state: ObservationState): LessonJudgement {
  const ratings = new Map<number, Level>();
  for (const [id, r] of Object.entries(state.ratings)) if (r.level) ratings.set(Number(id), r.level);
  return computeJudgement(
    rubric.map((a) => {
      const o = state.areaOverrides[a.id];
      return {
        areaId: a.id,
        criterionIds: a.criteria.map((c) => c.id),
        override: o?.level ? { level: o.level, reason: o.reason } : null,
      };
    }),
    ratings,
    state.overall.level ? { level: state.overall.level, reason: state.overall.reason } : null,
  );
}

export type VisitStatus = "not_started" | "in_progress" | "complete";

export interface VisitListItem extends VisitSummary {
  status: VisitStatus;
  ratedCount: number;
}

export async function listVisits(filter: { observerUserId?: string }): Promise<VisitListItem[]> {
  const rows = await db
    .select({
      id: visits.id,
      teacherId: visits.teacherId,
      teacherName: teachers.name,
      observerName: visits.observerName,
      observerUserId: visits.observerUserId,
      className: visits.className,
      subject: visits.subject,
      date: visits.date,
      period: visits.period,
      cycleLabel: observationCycles.label,
      cycleStart: observationCycles.startDate,
      cycleEnd: observationCycles.endDate,
      observationId: observations.id,
      observationStatus: observations.status,
    })
    .from(visits)
    .innerJoin(teachers, eq(teachers.id, visits.teacherId))
    .innerJoin(observationCycles, eq(observationCycles.id, visits.cycleId))
    .leftJoin(observations, eq(observations.visitId, visits.id))
    .where(filter.observerUserId ? eq(visits.observerUserId, filter.observerUserId) : undefined)
    .orderBy(asc(visits.date), asc(visits.period));

  const observationIds = rows.map((r) => r.observationId).filter((id): id is string => id !== null);
  const counts = new Map<string, number>();
  if (observationIds.length > 0) {
    const rated = await db
      .select({ observationId: observationRatings.observationId, level: observationRatings.level })
      .from(observationRatings)
      .where(inArray(observationRatings.observationId, observationIds));
    for (const r of rated) if (r.level !== null) counts.set(r.observationId, (counts.get(r.observationId) ?? 0) + 1);
  }
  return rows.map(({ observationId, observationStatus, ...rest }) => ({
    ...rest,
    status: observationStatus === "complete" ? "complete" : observationId ? "in_progress" : "not_started",
    ratedCount: observationId ? (counts.get(observationId) ?? 0) : 0,
  }));
}

export interface PreviousObservation {
  date: string;
  observerName: string;
  className: string;
  subject: string;
  status: "draft" | "complete";
  ownObservation: boolean;
  judgement: LessonJudgement;
  ratings: Record<number, { level: Level | null; comment: string }>;
}

/**
 * The teacher's most recent other observation that has ratings. Levels are shown to any observer
 * (the school dashboard shows them too); comments only to the observer who wrote them, or admin.
 */
export async function getPreviousObservation(
  visit: VisitSummary,
  rubric: RubricArea[],
  viewer: { id: string; role: string },
): Promise<PreviousObservation | null> {
  const candidates = await db
    .select({ visitId: visits.id })
    .from(visits)
    .innerJoin(observations, eq(observations.visitId, visits.id))
    .where(and(eq(visits.teacherId, visit.teacherId), ne(visits.id, visit.id)))
    .orderBy(desc(visits.date), desc(visits.period));
  for (const candidate of candidates) {
    const other = await getVisit(candidate.visitId);
    if (!other) continue;
    const state = await getObservationState(other);
    const rated = Object.values(state.ratings).some((r) => r.level !== null);
    if (!rated) continue;
    const own = viewer.role === "ADMIN" || other.observerUserId === viewer.id;
    const ratings: PreviousObservation["ratings"] = {};
    for (const [id, r] of Object.entries(state.ratings)) {
      ratings[Number(id)] = { level: r.level, comment: own ? r.comment : "" };
    }
    return {
      date: state.header.observedDate || other.date,
      observerName: other.observerName,
      className: other.className,
      subject: other.subject,
      status: state.status,
      ownObservation: own,
      judgement: judgementFor(rubric, state),
      ratings,
    };
  }
  return null;
}

export async function listUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
      mustChangePassword: users.mustChangePassword,
      passwordChangedAt: users.passwordChangedAt,
    })
    .from(users)
    .orderBy(asc(users.role), asc(users.name));
}
