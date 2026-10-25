import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { observationCycles, observations, teachers, visits } from "@/db/schema";
import { getMode } from "./mode";
import type { CurrentUser } from "./session";

export type VisitAccess = "edit" | "read" | "teacher" | "none";

/**
 * Observers (the coordinators) and admin read every visit and edit only visits assigned to them.
 * A teacher reads only their own observation, and only once it has been shared with them.
 * Demo visits are reachable only before Go live, real visits only after.
 */
export async function visitAccess(user: CurrentUser, visitId: string): Promise<VisitAccess> {
  const [visit] = await db
    .select({
      observerUserId: visits.observerUserId,
      teacherUserId: teachers.userId,
      isDemo: observationCycles.isDemo,
      sharedAt: observations.sharedAt,
    })
    .from(visits)
    .innerJoin(observationCycles, eq(observationCycles.id, visits.cycleId))
    .innerJoin(teachers, eq(teachers.id, visits.teacherId))
    .leftJoin(observations, eq(observations.visitId, visits.id))
    .where(eq(visits.id, visitId))
    .limit(1);
  if (!visit) return "none";
  if (visit.isDemo !== ((await getMode()) === "demo")) return "none";
  if (visit.observerUserId === user.id && (user.role === "OBSERVER" || user.role === "ADMIN")) return "edit";
  // The observed teacher (whatever else they do in school) sees their own observation once it is shared.
  if (visit.teacherUserId === user.id && visit.sharedAt !== null) return "teacher";
  // Admin and the coordinators read every observation; each edits only their own.
  if (user.role === "ADMIN" || user.role === "OBSERVER") return "read";
  return "none";
}

/** Observers and admin see the school dashboard; teachers do not. */
export function canSeeDashboard(user: CurrentUser): boolean {
  return user.role === "ADMIN" || user.role === "OBSERVER";
}
