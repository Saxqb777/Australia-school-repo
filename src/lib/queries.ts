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
  teacherReflections,
  teachers,
  users,
  visits,
} from "@/db/schema";
import { computeJudgement, isLevel, type Level, type LessonJudgement } from "./judgement";
import type { GradeBand } from "./names";
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
  strengths: string;
  improvements: string;
  feedback: string;
  summaryGeneratedAt: string | null;
  sharedAt: string | null;
  signedByTeacherAt: string | null;
  signedByTeacherName: string | null;
  signedByCoordinatorAt: string | null;
  signedByCoordinatorName: string | null;
  reflection: { text: string; updatedAt: string } | null;
}

export interface VisitSummary {
  id: string;
  cycleId: string;
  teacherId: string;
  teacherName: string;
  teacherUserId: string | null;
  observerName: string;
  observerUserId: string | null;
  className: string;
  subject: string;
  date: string;
  period: number;
  cycleLabel: string;
  cycleStart: string;
  cycleEnd: string;
  cycleIsDemo: boolean;
}

const visitColumns = {
  id: visits.id,
  cycleId: visits.cycleId,
  teacherId: visits.teacherId,
  teacherName: teachers.name,
  teacherUserId: teachers.userId,
  observerName: visits.observerName,
  observerUserId: visits.observerUserId,
  className: visits.className,
  subject: visits.subject,
  date: visits.date,
  period: visits.period,
  cycleLabel: observationCycles.label,
  cycleStart: observationCycles.startDate,
  cycleEnd: observationCycles.endDate,
  cycleIsDemo: observationCycles.isDemo,
};

export async function getVisit(visitId: string): Promise<VisitSummary | null> {
  const [row] = await db
    .select(visitColumns)
    .from(visits)
    .innerJoin(teachers, eq(teachers.id, visits.teacherId))
    .innerJoin(observationCycles, eq(observationCycles.id, visits.cycleId))
    .where(eq(visits.id, visitId))
    .limit(1);
  return row ?? null;
}

const str = (v: string | number | null | undefined): string => (v === null || v === undefined ? "" : String(v));
const iso = (d: Date | null | undefined): string | null => d?.toISOString() ?? null;

export function emptyState(visit: VisitSummary): ObservationState {
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
      strengthsText: "",
      improvementsText: "",
      feedbackText: "",
    },
    ratings: {},
    areaOverrides: {},
    overall: { level: null, reason: "" },
    strengths: "",
    improvements: "",
    feedback: "",
    summaryGeneratedAt: null,
    sharedAt: null,
    signedByTeacherAt: null,
    signedByTeacherName: null,
    signedByCoordinatorAt: null,
    signedByCoordinatorName: null,
    reflection: null,
  };
}

export async function getObservationState(visit: VisitSummary): Promise<ObservationState> {
  const observation = await db.query.observations.findFirst({ where: eq(observations.visitId, visit.id) });
  if (!observation) return emptyState(visit);
  const [ratingRows, areaRows, reflection] = await Promise.all([
    db.select().from(observationRatings).where(eq(observationRatings.observationId, observation.id)),
    db.select().from(areaJudgements).where(eq(areaJudgements.observationId, observation.id)),
    db.query.teacherReflections.findFirst({ where: eq(teacherReflections.observationId, observation.id) }),
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
    completedAt: iso(observation.completedAt),
    header: {
      observedDate: str(observation.observedDate),
      time: str(observation.time),
      lengthOfObservation: str(observation.lengthOfObservation),
      title: str(observation.title),
      subject: str(observation.subject),
      topic: str(observation.topic),
      numberOnRoll: str(observation.numberOnRoll),
      numberPresent: str(observation.numberPresent),
      strengthsText: str(observation.strengthsText),
      improvementsText: str(observation.improvementsText),
      feedbackText: str(observation.feedbackText),
    },
    ratings,
    areaOverrides,
    overall: {
      level: isLevel(observation.overallOverrideLevel) ? observation.overallOverrideLevel : null,
      reason: observation.overallOverrideReason ?? "",
    },
    strengths: str(observation.strengthsText),
    improvements: str(observation.improvementsText),
    feedback: str(observation.feedbackText),
    summaryGeneratedAt: iso(observation.summaryGeneratedAt),
    sharedAt: iso(observation.sharedAt),
    signedByTeacherAt: iso(observation.signedByTeacherAt),
    signedByTeacherName: observation.signedByTeacherName,
    signedByCoordinatorAt: iso(observation.signedByCoordinatorAt),
    signedByCoordinatorName: observation.signedByCoordinatorName,
    reflection: reflection ? { text: reflection.text, updatedAt: reflection.updatedAt.toISOString() } : null,
  };
}

export function judgementFor(rubric: RubricArea[], state: Pick<ObservationState, "ratings" | "areaOverrides" | "overall">): LessonJudgement {
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
  shared: boolean;
}

export async function listVisits(filter: {
  demo: boolean;
  observerUserId?: string;
  cycleId?: string;
}): Promise<VisitListItem[]> {
  const conditions = [eq(observationCycles.isDemo, filter.demo)];
  if (filter.observerUserId) conditions.push(eq(visits.observerUserId, filter.observerUserId));
  if (filter.cycleId) conditions.push(eq(visits.cycleId, filter.cycleId));
  const rows = await db
    .select({
      ...visitColumns,
      observationId: observations.id,
      observationStatus: observations.status,
      sharedAt: observations.sharedAt,
    })
    .from(visits)
    .innerJoin(teachers, eq(teachers.id, visits.teacherId))
    .innerJoin(observationCycles, eq(observationCycles.id, visits.cycleId))
    .leftJoin(observations, eq(observations.visitId, visits.id))
    .where(and(...conditions))
    .orderBy(desc(observationCycles.startDate), asc(visits.date), asc(visits.period));

  const observationIds = rows.map((r) => r.observationId).filter((id): id is string => id !== null);
  const counts = new Map<string, number>();
  if (observationIds.length > 0) {
    const rated = await db
      .select({ observationId: observationRatings.observationId, level: observationRatings.level })
      .from(observationRatings)
      .where(inArray(observationRatings.observationId, observationIds));
    for (const r of rated) if (r.level !== null) counts.set(r.observationId, (counts.get(r.observationId) ?? 0) + 1);
  }
  return rows.map(({ observationId, observationStatus, sharedAt, ...rest }) => ({
    ...rest,
    status: observationStatus === "complete" ? "complete" : observationId ? "in_progress" : "not_started",
    ratedCount: observationId ? (counts.get(observationId) ?? 0) : 0,
    shared: sharedAt !== null,
  }));
}

export async function listCycles(demo: boolean) {
  return db
    .select()
    .from(observationCycles)
    .where(eq(observationCycles.isDemo, demo))
    .orderBy(desc(observationCycles.startDate));
}

/** One completed observation, flattened for analytics. */
export interface ObservationFact {
  observationId: string;
  visitId: string;
  cycleId: string;
  cycleLabel: string;
  cycleStart: string;
  date: string;
  teacherId: string;
  teacherName: string;
  gradeBand: GradeBand | null;
  subject: string;
  className: string;
  observerName: string;
  observerUserId: string | null;
  ratings: Map<number, Level>;
  areaLevels: Map<number, Level>;
  overall: Level | null;
}

export interface FactFilter {
  demo: boolean;
  cycleId?: string;
  observerUserId?: string;
  subject?: string;
  gradeBand?: GradeBand;
  teacherId?: string;
}

/** Completed observations with ratings and effective area levels, for dashboards, insights and progress. */
export async function loadFacts(rubric: RubricArea[], filter: FactFilter): Promise<ObservationFact[]> {
  const conditions = [eq(observationCycles.isDemo, filter.demo), eq(observations.status, "complete")];
  if (filter.cycleId) conditions.push(eq(visits.cycleId, filter.cycleId));
  if (filter.observerUserId) conditions.push(eq(visits.observerUserId, filter.observerUserId));
  if (filter.subject) conditions.push(eq(visits.subject, filter.subject));
  if (filter.gradeBand) conditions.push(eq(teachers.gradeBand, filter.gradeBand));
  if (filter.teacherId) conditions.push(eq(visits.teacherId, filter.teacherId));
  const rows = await db
    .select({
      observationId: observations.id,
      visitId: visits.id,
      cycleId: visits.cycleId,
      cycleLabel: observationCycles.label,
      cycleStart: observationCycles.startDate,
      date: visits.date,
      observedDate: observations.observedDate,
      teacherId: teachers.id,
      teacherName: teachers.name,
      gradeBand: teachers.gradeBand,
      subject: visits.subject,
      className: visits.className,
      observerName: visits.observerName,
      observerUserId: visits.observerUserId,
      overallOverride: observations.overallOverrideLevel,
    })
    .from(observations)
    .innerJoin(visits, eq(visits.id, observations.visitId))
    .innerJoin(teachers, eq(teachers.id, visits.teacherId))
    .innerJoin(observationCycles, eq(observationCycles.id, visits.cycleId))
    .where(and(...conditions))
    .orderBy(asc(observationCycles.startDate), asc(visits.date));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.observationId);
  const [ratingRows, areaRows] = await Promise.all([
    db
      .select({ observationId: observationRatings.observationId, criterionId: observationRatings.criterionId, level: observationRatings.level })
      .from(observationRatings)
      .where(inArray(observationRatings.observationId, ids)),
    db
      .select({ observationId: areaJudgements.observationId, areaId: areaJudgements.areaId, level: areaJudgements.overrideLevel, reason: areaJudgements.reason })
      .from(areaJudgements)
      .where(inArray(areaJudgements.observationId, ids)),
  ]);
  const ratingsBy = new Map<string, Map<number, Level>>();
  for (const r of ratingRows) {
    if (!isLevel(r.level)) continue;
    const m = ratingsBy.get(r.observationId) ?? new Map<number, Level>();
    m.set(r.criterionId, r.level);
    ratingsBy.set(r.observationId, m);
  }
  const overridesBy = new Map<string, Map<number, { level: Level; reason: string }>>();
  for (const a of areaRows) {
    if (!isLevel(a.level)) continue;
    const m = overridesBy.get(a.observationId) ?? new Map<number, { level: Level; reason: string }>();
    m.set(a.areaId, { level: a.level, reason: a.reason ?? "" });
    overridesBy.set(a.observationId, m);
  }
  return rows.map((r) => {
    const ratings = ratingsBy.get(r.observationId) ?? new Map<number, Level>();
    const overrides = overridesBy.get(r.observationId);
    const j = computeJudgement(
      rubric.map((a) => ({ areaId: a.id, criterionIds: a.criteria.map((c) => c.id), override: overrides?.get(a.id) ?? null })),
      ratings,
      isLevel(r.overallOverride) ? { level: r.overallOverride, reason: "" } : null,
    );
    const areaLevels = new Map<number, Level>();
    for (const a of j.areas) if (a.effective) areaLevels.set(a.areaId, a.effective);
    return {
      observationId: r.observationId,
      visitId: r.visitId,
      cycleId: r.cycleId,
      cycleLabel: r.cycleLabel,
      cycleStart: r.cycleStart,
      date: r.observedDate ?? r.date,
      teacherId: r.teacherId,
      teacherName: r.teacherName,
      gradeBand: r.gradeBand,
      subject: r.subject,
      className: r.className,
      observerName: r.observerName,
      observerUserId: r.observerUserId,
      ratings,
      areaLevels,
      overall: j.overallEffective,
    };
  });
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
 * The teacher's most recent earlier observation that has ratings. Levels are shown to any observer
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
    .innerJoin(observationCycles, eq(observationCycles.id, visits.cycleId))
    .where(
      and(eq(visits.teacherId, visit.teacherId), ne(visits.id, visit.id), eq(observationCycles.isDemo, visit.cycleIsDemo)),
    )
    .orderBy(desc(visits.date), desc(visits.period));
  for (const candidate of candidates) {
    const other = await getVisit(candidate.visitId);
    if (!other || other.date > visit.date) continue;
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

export async function listTeachers() {
  return db
    .select({
      id: teachers.id,
      name: teachers.name,
      userId: teachers.userId,
      gradeBand: teachers.gradeBand,
      subjects: teachers.subjects,
    })
    .from(teachers)
    .orderBy(asc(teachers.name));
}
