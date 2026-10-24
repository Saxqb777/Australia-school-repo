import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { peerPairings, teachers, users, visits } from "@/db/schema";
import {
  areaMeans,
  criterionMeans,
  expertsByArea,
  flaggedByArea,
  latestPerTeacher,
  peerPairs,
  workshopPlan,
  type PairSuggestion,
  type TeacherInArea,
  type WorkshopSuggestion,
} from "./analytics";
import type { GradeBand } from "./names";
import { getRubric, listCycles, loadFacts, type ObservationFact, type RubricArea } from "./queries";

export interface DashboardFilters {
  cycleId?: string;
  observerUserId?: string;
  subject?: string;
  gradeBand?: GradeBand;
}

export interface DashboardData {
  rubric: RubricArea[];
  facts: ObservationFact[];
  latest: ObservationFact[];
  areaMean: Map<number, number | null>;
  criterionMean: Map<number, number | null>;
  overallMean: number | null;
  experts: Map<number, TeacherInArea[]>;
  flagged: Map<number, TeacherInArea[]>;
  plan: WorkshopSuggestion[];
  pairs: (PairSuggestion & { introducedAt: Date | null })[];
  options: {
    cycles: { id: string; label: string }[];
    observers: { id: string; name: string }[];
    subjects: string[];
  };
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): DashboardFilters {
  const one = (k: string) => {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() !== "" ? s : undefined;
  };
  const band = one("band");
  return {
    cycleId: one("cycle"),
    observerUserId: one("observer"),
    subject: one("subject"),
    gradeBand: band === "KG" || band === "LOWER_PRIMARY" || band === "UPPER_PRIMARY" ? band : undefined,
  };
}

export function filtersToQuery(f: DashboardFilters): string {
  const p = new URLSearchParams();
  if (f.cycleId) p.set("cycle", f.cycleId);
  if (f.observerUserId) p.set("observer", f.observerUserId);
  if (f.subject) p.set("subject", f.subject);
  if (f.gradeBand) p.set("band", f.gradeBand);
  const q = p.toString();
  return q ? `?${q}` : "";
}

export async function loadDashboard(demo: boolean, filters: DashboardFilters): Promise<DashboardData> {
  const rubric = await getRubric();
  const [facts, cycles, observerRows, subjectRows, introduced] = await Promise.all([
    loadFacts(rubric, { demo, ...filters }),
    listCycles(demo),
    db.selectDistinct({ id: users.id, name: users.name }).from(users).where(eq(users.role, "OBSERVER")),
    db.selectDistinct({ subject: visits.subject }).from(visits),
    db.select().from(peerPairings).where(eq(peerPairings.isDemo, demo)),
  ]);
  const latest = latestPerTeacher(facts);
  const areaIds = rubric.map((a) => a.id);
  const areaMean = areaMeans(latest, areaIds);
  const overallValues = latest.map((f) => f.overall).filter((v): v is NonNullable<typeof v> => v !== null);
  const introducedKey = new Map(introduced.map((p) => [`${p.teacherId}:${p.partnerTeacherId}:${p.areaId}`, p.introducedAt]));
  return {
    rubric,
    facts,
    latest,
    areaMean,
    criterionMean: criterionMeans(latest, rubric.flatMap((a) => a.criteria.map((c) => c.id))),
    overallMean: overallValues.length ? overallValues.reduce((s, v) => s + v, 0) / overallValues.length : null,
    experts: expertsByArea(latest, rubric),
    flagged: flaggedByArea(latest, rubric),
    plan: workshopPlan(latest, rubric),
    pairs: peerPairs(latest, rubric).map((p) => ({
      ...p,
      introducedAt: introducedKey.get(`${p.teacher.teacherId}:${p.partner.teacherId}:${p.areaId}`) ?? null,
    })),
    options: {
      cycles: cycles.map((c) => ({ id: c.id, label: c.label })),
      observers: observerRows.sort((a, b) => a.name.localeCompare(b.name)),
      subjects: subjectRows.map((s) => s.subject).sort(),
    },
  };
}

/** Users linked to teacher records, for in-app notices. */
export async function teacherUserIds(teacherIds: string[]): Promise<Map<string, string>> {
  if (teacherIds.length === 0) return new Map();
  const rows = await db.select({ id: teachers.id, userId: teachers.userId }).from(teachers);
  const wanted = new Set(teacherIds);
  return new Map(rows.filter((r) => wanted.has(r.id) && r.userId).map((r) => [r.id, r.userId as string]));
}

