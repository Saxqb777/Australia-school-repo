import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { visits } from "@/db/schema";
import type { CurrentUser } from "./session";

export type VisitAccess = "edit" | "read" | "none";

/**
 * Observers edit only their own visits. Admin can read every visit, and edits only visits assigned to them.
 * Teachers have no access to the observation form.
 */
export async function visitAccess(user: CurrentUser, visitId: string): Promise<VisitAccess> {
  const visit = await db.query.visits.findFirst({ where: eq(visits.id, visitId), columns: { observerUserId: true } });
  if (!visit) return "none";
  if (visit.observerUserId === user.id && (user.role === "OBSERVER" || user.role === "ADMIN")) return "edit";
  if (user.role === "ADMIN") return "read";
  return "none";
}
