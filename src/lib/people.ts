import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teachers, users } from "@/db/schema";
import { gradeBandForClass, usernameForName } from "./names";

const WORDS = [
  "amber", "anchor", "atlas", "birch", "bridge", "canyon", "cedar", "comet", "coral", "delta",
  "ember", "falcon", "fern", "garnet", "harbor", "harvest", "island", "jasmine", "juniper", "lagoon",
  "lantern", "maple", "meadow", "meteor", "olive", "orbit", "pebble", "pepper", "prairie", "quartz",
  "raven", "ripple", "saffron", "sierra", "summit", "thistle", "timber", "tulip", "valley", "willow",
];

export function temporaryPassword(): string {
  const pick = (): string => WORDS[randomInt(WORDS.length)] ?? "school";
  return `${pick()}-${randomInt(1000, 10000)}-${pick()}`;
}

export interface NewLogin {
  name: string;
  username: string;
  password: string;
  role: "ADMIN" | "OBSERVER" | "TEACHER";
}

async function uniqueUsername(base: string): Promise<string> {
  let candidate = base || "user";
  for (let i = 2; i < 100; i += 1) {
    const taken = await db.query.users.findFirst({ where: eq(users.username, candidate), columns: { id: true } });
    if (!taken) return candidate;
    candidate = `${base}${i}`;
  }
  throw new Error("Could not find a free username");
}

export async function createLogin(name: string, role: NewLogin["role"]): Promise<{ id: string; login: NewLogin }> {
  const username = await uniqueUsername(usernameForName(name));
  const password = temporaryPassword();
  const [row] = await db
    .insert(users)
    .values({ name, username, role, passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true })
    .returning({ id: users.id });
  if (!row) throw new Error("Could not create login");
  return { id: row.id, login: { name, username, password, role } };
}

/** Finds a teacher by name, or creates the teacher record and a teacher login. */
export async function ensureTeacher(
  name: string,
  className: string,
  subject: string,
): Promise<{ teacherId: string; created: NewLogin | null }> {
  const existing = await db.query.teachers.findFirst({ where: eq(teachers.name, name) });
  if (existing) {
    if (!existing.subjects.includes(subject)) {
      await db.update(teachers).set({ subjects: [...existing.subjects, subject] }).where(eq(teachers.id, existing.id));
    }
    return { teacherId: existing.id, created: null };
  }
  const { id: userId, login } = await createLogin(name, "TEACHER");
  const [t] = await db
    .insert(teachers)
    .values({ name, userId, subjects: [subject], gradeBand: gradeBandForClass(className) })
    .returning({ id: teachers.id });
  if (!t) throw new Error("Could not create teacher");
  return { teacherId: t.id, created: login };
}
