/** School-wide analysis of completed observations. Pure functions so the rules are testable and explainable. */

import type { GradeBand } from "./names";
import type { Level } from "./judgement";

export interface FactLike {
  observationId: string;
  cycleStart: string;
  date: string;
  teacherId: string;
  teacherName: string;
  gradeBand: GradeBand | null;
  ratings: ReadonlyMap<number, Level>;
  areaLevels: ReadonlyMap<number, Level>;
  overall: Level | null;
}

export interface AreaLike {
  id: number;
  name: string;
  judgementLabel: string;
  criteria: { id: number; code: string; name: string }[];
}

/** Very Good or Outstanding in an area makes a teacher an expert there; Acceptable or below flags them. */
export const EXPERT_MAX_LEVEL = 2;
export const FLAG_MIN_LEVEL = 4;

const chronological = (a: FactLike, b: FactLike) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Each teacher's most recent observation within the facts given. */
export function latestPerTeacher<T extends FactLike>(facts: readonly T[]): T[] {
  const latest = new Map<string, T>();
  for (const f of [...facts].sort(chronological)) latest.set(f.teacherId, f);
  return [...latest.values()].sort((a, b) => a.teacherName.localeCompare(b.teacherName));
}

export function criterionMeans(facts: readonly FactLike[], criterionIds: readonly number[]): Map<number, number | null> {
  const out = new Map<number, number | null>();
  for (const id of criterionIds) {
    out.set(id, mean(facts.map((f) => f.ratings.get(id)).filter((v): v is Level => v !== undefined)));
  }
  return out;
}

export function areaMeans(facts: readonly FactLike[], areaIds: readonly number[]): Map<number, number | null> {
  const out = new Map<number, number | null>();
  for (const id of areaIds) {
    out.set(id, mean(facts.map((f) => f.areaLevels.get(id)).filter((v): v is Level => v !== undefined)));
  }
  return out;
}

export interface TeacherInArea {
  teacherId: string;
  teacherName: string;
  gradeBand: GradeBand | null;
  level: Level;
}

export function expertsByArea(latest: readonly FactLike[], areas: readonly AreaLike[]): Map<number, TeacherInArea[]> {
  const out = new Map<number, TeacherInArea[]>();
  for (const a of areas) {
    out.set(
      a.id,
      latest
        .filter((f) => (f.areaLevels.get(a.id) ?? 99) <= EXPERT_MAX_LEVEL)
        .map((f) => ({ teacherId: f.teacherId, teacherName: f.teacherName, gradeBand: f.gradeBand, level: f.areaLevels.get(a.id) as Level }))
        .sort((x, y) => x.level - y.level || x.teacherName.localeCompare(y.teacherName)),
    );
  }
  return out;
}

export function flaggedByArea(latest: readonly FactLike[], areas: readonly AreaLike[]): Map<number, TeacherInArea[]> {
  const out = new Map<number, TeacherInArea[]>();
  for (const a of areas) {
    out.set(
      a.id,
      latest
        .filter((f) => (f.areaLevels.get(a.id) ?? 0) >= FLAG_MIN_LEVEL)
        .map((f) => ({ teacherId: f.teacherId, teacherName: f.teacherName, gradeBand: f.gradeBand, level: f.areaLevels.get(a.id) as Level }))
        .sort((x, y) => y.level - x.level || x.teacherName.localeCompare(y.teacherName)),
    );
  }
  return out;
}

export interface WorkshopSuggestion {
  areaId: number;
  areaName: string;
  title: string;
  areaMean: number;
  attendees: TeacherInArea[];
  leads: TeacherInArea[];
  criteria: { code: string; name: string; mean: number }[];
}

/**
 * One suggestion per weak area: the areas with the weakest school mean that have at least one flagged teacher.
 * Attendees are the flagged teachers; leads are the area's experts; the criteria are the area's weakest.
 */
export function workshopPlan(latest: readonly FactLike[], areas: readonly AreaLike[], limit = 3): WorkshopSuggestion[] {
  const means = areaMeans(latest, areas.map((a) => a.id));
  const experts = expertsByArea(latest, areas);
  const flagged = flaggedByArea(latest, areas);
  const cMeans = criterionMeans(latest, areas.flatMap((a) => a.criteria.map((c) => c.id)));
  return areas
    .filter((a) => (flagged.get(a.id) ?? []).length > 0 && means.get(a.id) !== null)
    .sort((a, b) => (means.get(b.id) ?? 0) - (means.get(a.id) ?? 0))
    .slice(0, limit)
    .map((a) => ({
      areaId: a.id,
      areaName: a.name,
      title: `${a.name}: next steps`,
      areaMean: means.get(a.id) ?? 0,
      attendees: flagged.get(a.id) ?? [],
      leads: (experts.get(a.id) ?? []).slice(0, 2),
      criteria: a.criteria
        .map((c) => ({ code: c.code, name: c.name, mean: cMeans.get(c.id) ?? null }))
        .filter((c): c is { code: string; name: string; mean: number } => c.mean !== null)
        .sort((x, y) => y.mean - x.mean)
        .slice(0, 3),
    }));
}

export interface PairSuggestion {
  areaId: number;
  areaName: string;
  teacher: TeacherInArea;
  partner: TeacherInArea;
}

/**
 * Pairs each flagged teacher with the strongest colleague in that area. Same grade band is preferred, and no
 * colleague is asked to support more than `maxPerPartner` teachers.
 */
export function peerPairs(latest: readonly FactLike[], areas: readonly AreaLike[], maxPerPartner = 2): PairSuggestion[] {
  const experts = expertsByArea(latest, areas);
  const flagged = flaggedByArea(latest, areas);
  const load = new Map<string, number>();
  const out: PairSuggestion[] = [];
  for (const a of areas) {
    for (const t of flagged.get(a.id) ?? []) {
      const candidates = (experts.get(a.id) ?? [])
        .filter((e) => e.teacherId !== t.teacherId && (load.get(e.teacherId) ?? 0) < maxPerPartner)
        .sort(
          (x, y) =>
            x.level - y.level ||
            Number(y.gradeBand === t.gradeBand) - Number(x.gradeBand === t.gradeBand) ||
            (load.get(x.teacherId) ?? 0) - (load.get(y.teacherId) ?? 0) ||
            x.teacherName.localeCompare(y.teacherName),
        );
      const partner = candidates[0];
      if (!partner) continue;
      load.set(partner.teacherId, (load.get(partner.teacherId) ?? 0) + 1);
      out.push({ areaId: a.id, areaName: a.name, teacher: t, partner });
    }
  }
  return out;
}

export interface CriterionDelta {
  criterionId: number;
  before: Level | null;
  after: Level | null;
  /** Positive means improved (levels go down as they get better). */
  change: number | null;
}

export function criterionDeltas(before: FactLike, after: FactLike, criterionIds: readonly number[]): CriterionDelta[] {
  return criterionIds.map((id) => {
    const b = before.ratings.get(id) ?? null;
    const a = after.ratings.get(id) ?? null;
    return { criterionId: id, before: b, after: a, change: b !== null && a !== null ? b - a : null };
  });
}

export interface WorkshopEffect {
  before: Level | null;
  after: Level | null;
  change: number | null;
}

/** Compares a teacher's area level in the observation before a workshop with the first one after it. */
export function workshopEffect(teacherFacts: readonly FactLike[], areaId: number, workshopDate: string): WorkshopEffect {
  const sorted = [...teacherFacts].sort(chronological);
  const before = [...sorted].reverse().find((f) => f.date <= workshopDate);
  const after = sorted.find((f) => f.date > workshopDate);
  const b = before?.areaLevels.get(areaId) ?? null;
  const a = after?.areaLevels.get(areaId) ?? null;
  return { before: b, after: a, change: b !== null && a !== null ? b - a : null };
}
