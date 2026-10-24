import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { visitAccess, type VisitAccess } from "./access";
import { getObservationState, getVisit, type ObservationState, type VisitSummary } from "./queries";
import { getCurrentUser, type CurrentUser } from "./session";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

export interface VisitContext {
  user: CurrentUser;
  access: VisitAccess;
  visit: VisitSummary;
  state: ObservationState;
}

/** Signed-in user, their access to this visit, and the observation, or an error response. */
export async function loadVisitContext(visitId: string): Promise<VisitContext | NextResponse> {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return jsonError(401, "Sign in again to continue.");
  if (!z.uuid().safeParse(visitId).success) return jsonError(404, "This visit does not exist.");
  const access = await visitAccess(user, visitId);
  if (access === "none") return jsonError(404, "This visit does not exist.");
  const visit = await getVisit(visitId);
  if (!visit) return jsonError(404, "This visit does not exist.");
  const state = await getObservationState(visit);
  return { user, access, visit, state };
}
