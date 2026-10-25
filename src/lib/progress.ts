import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { CurrentUser } from "./session";

/**
 * "Your first steps" checklist. Each step is ticked when the person really does it, and stored alongside the
 * finished tours in `users.tours_completed` as `step:<key>`, so Go live and Reset the demo clear both together.
 */
export const OBSERVER_STEPS = [
  { key: "rate", label: "Rate a lesson" },
  { key: "summary", label: "Draft the letter with AI" },
  { key: "sign", label: "Mark complete and sign" },
  { key: "share", label: "Share with the teacher" },
] as const;

export const TEACHER_STEPS = [
  { key: "open", label: "Open your feedback" },
  { key: "arabic", label: "Read it in Arabic" },
  { key: "sign-teacher", label: "Sign it" },
  { key: "reflect", label: "Send a reflection" },
] as const;

export type StepKey = (typeof OBSERVER_STEPS)[number]["key"] | (typeof TEACHER_STEPS)[number]["key"];

/** Set when the person closes the finished checklist. */
export const STEPS_DISMISSED = "steps-dismissed";

export function stepMark(key: StepKey): string {
  return `step:${key}`;
}

/** Ticks a step the first time the person does it. A no-op (no query) once it is already ticked. */
export async function markStep(user: Pick<CurrentUser, "id" | "toursCompleted">, key: StepKey): Promise<void> {
  const mark = stepMark(key);
  if (user.toursCompleted.includes(mark)) return;
  await db
    .update(users)
    .set({ toursCompleted: sql`array_append(${users.toursCompleted}, ${mark})` })
    .where(and(eq(users.id, user.id), sql`not (${mark} = any(${users.toursCompleted}))`));
}
