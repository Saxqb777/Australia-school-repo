import { randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { RUBRIC } from "../src/db/seed-data/rubric";
import {
  ADMIN_USER,
  CYCLE,
  DAY_DATES,
  OBSERVER_USERS,
  SCHEDULE,
} from "../src/db/seed-data/schedule";
import { gradeBandForClass, usernameForName } from "../src/lib/names";

const WORDS = [
  "amber", "anchor", "atlas", "birch", "bridge", "canyon", "cedar", "comet", "coral", "delta",
  "ember", "falcon", "fern", "garnet", "harbor", "harvest", "island", "jasmine", "juniper", "lagoon",
  "lantern", "maple", "meadow", "meteor", "olive", "orbit", "pebble", "pepper", "prairie", "quartz",
  "raven", "ripple", "saffron", "sierra", "summit", "thistle", "timber", "tulip", "valley", "willow",
];

function tempPassword(): string {
  const pick = (): string => WORDS[randomInt(WORDS.length)] ?? "school";
  return `${pick()}-${randomInt(1000, 10000)}-${pick()}`;
}

interface CreatedLogin {
  role: string;
  name: string;
  username: string;
  password: string;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = drizzle(neon(url), { schema });
  const created: CreatedLogin[] = [];

  // Rubric: insert only; never overwrite wording that already exists.
  for (const area of RUBRIC) {
    await db
      .insert(schema.rubricAreas)
      .values({ id: area.position, position: area.position, name: area.name, judgementLabel: area.judgementLabel })
      .onConflictDoNothing();
    for (const [index, criterion] of area.criteria.entries()) {
      const criterionId = area.position * 100 + index + 1;
      await db
        .insert(schema.rubricCriteria)
        .values({ id: criterionId, areaId: area.position, position: index + 1, code: criterion.code, name: criterion.name })
        .onConflictDoNothing();
      await db
        .insert(schema.rubricDescriptors)
        .values(
          Object.entries(criterion.descriptors).map(([level, text]) => ({
            criterionId,
            level: Number(level),
            text,
          })),
        )
        .onConflictDoNothing();
    }
  }

  async function ensureUser(
    name: string,
    username: string,
    role: "ADMIN" | "OBSERVER" | "TEACHER",
  ): Promise<string> {
    const existing = await db.query.users.findFirst({ where: eq(schema.users.username, username) });
    if (existing) return existing.id;
    const password = tempPassword();
    const [row] = await db
      .insert(schema.users)
      .values({
        name,
        username,
        role,
        email: username.includes("@") ? username : null,
        passwordHash: await bcrypt.hash(password, 10),
        mustChangePassword: true,
      })
      .returning({ id: schema.users.id });
    if (!row) throw new Error(`Could not create user ${username}`);
    created.push({ role, name, username, password });
    return row.id;
  }

  await ensureUser(ADMIN_USER.name, ADMIN_USER.username, "ADMIN");
  const observerIds = new Map<string, string>();
  for (const observer of OBSERVER_USERS) {
    observerIds.set(observer.name, await ensureUser(observer.name, observer.username, "OBSERVER"));
  }

  // Cycle
  await db
    .insert(schema.observationCycles)
    .values({
      academicYear: CYCLE.academicYear,
      term: CYCLE.term,
      week: CYCLE.week,
      label: CYCLE.label,
      startDate: CYCLE.startDate,
      endDate: CYCLE.endDate,
    })
    .onConflictDoNothing();
  const cycle = await db.query.observationCycles.findFirst({
    where: and(
      eq(schema.observationCycles.academicYear, CYCLE.academicYear),
      eq(schema.observationCycles.term, CYCLE.term),
      eq(schema.observationCycles.week, CYCLE.week),
    ),
  });
  if (!cycle) throw new Error("Cycle missing after insert");

  // Teachers: everyone observed on the schedule gets a teacher record and a teacher login.
  const teacherIds = new Map<string, string>();
  for (const row of SCHEDULE) {
    if (teacherIds.has(row.teacher)) continue;
    const userId = await ensureUser(row.teacher, usernameForName(row.teacher), "TEACHER");
    const subjects = [...new Set(SCHEDULE.filter((r) => r.teacher === row.teacher).map((r) => r.subject))];
    await db
      .insert(schema.teachers)
      .values({ name: row.teacher, userId, subjects, gradeBand: gradeBandForClass(row.className) })
      .onConflictDoNothing();
    const teacher = await db.query.teachers.findFirst({ where: eq(schema.teachers.name, row.teacher) });
    if (!teacher) throw new Error(`Teacher missing: ${row.teacher}`);
    teacherIds.set(row.teacher, teacher.id);
  }

  for (const row of SCHEDULE) {
    const teacherId = teacherIds.get(row.teacher);
    if (!teacherId) throw new Error(`No teacher id for ${row.teacher}`);
    await db
      .insert(schema.visits)
      .values({
        cycleId: cycle.id,
        observerUserId: observerIds.get(row.observer) ?? null,
        observerName: row.observer,
        teacherId,
        className: row.className,
        subject: row.subject,
        date: DAY_DATES[row.day],
        period: row.period,
      })
      .onConflictDoNothing();
  }

  const [counts] = await db.execute<{ visits: number; teachers: number; users: number; descriptors: number }>(
    sql`select (select count(*) from visits)::int as visits, (select count(*) from teachers)::int as teachers,
        (select count(*) from users)::int as users, (select count(*) from rubric_descriptors)::int as descriptors`,
  ).then((r) => r.rows);
  console.log("Seed complete", counts);

  const out = process.env.CREDENTIALS_OUT;
  if (created.length > 0) {
    const lines = created.map((c) => `${c.role}\t${c.name}\t${c.username}\t${c.password}`);
    const body = ["Role\tName\tUsername\tTemporary password", ...lines].join("\n") + "\n";
    if (out) {
      writeFileSync(out, body, { mode: 0o600 });
      console.log(`Wrote ${created.length} new logins to ${out}`);
    } else {
      console.log(`Created ${created.length} logins. Set CREDENTIALS_OUT to save their temporary passwords.`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
