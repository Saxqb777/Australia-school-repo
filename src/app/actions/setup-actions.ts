"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { observationCycles, rubricCriteria, rubricDescriptors, rubricEdits, teachers, users, visits } from "@/db/schema";
import { getMode } from "@/lib/mode";
import { createLogin, ensureTeacher, type NewLogin } from "@/lib/people";
import { parseSchedule, type ParsedVisit } from "@/lib/schedule-import";
import { getCurrentUser } from "@/lib/session";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Only the administrator can do this.");
  return user;
}

export interface SetupState {
  ok: boolean;
  message: string | null;
  logins?: NewLogin[];
  preview?: { rows: (ParsedVisit & { teacherIsNew: boolean; observerHasLogin: boolean })[]; errors: { line: number; message: string }[] };
  text?: string;
  cycleId?: string;
}

const cycleSchema = z.object({
  academicYear: z.string().trim().min(4).max(20),
  term: z.coerce.number().int().min(1).max(4),
  week: z.coerce.number().int().min(1).max(60),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createCycleAction(_prev: SetupState, formData: FormData): Promise<SetupState> {
  await requireAdmin();
  const parsed = cycleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Fill in the year, term, week and both dates." };
  const c = parsed.data;
  if (c.endDate < c.startDate) return { ok: false, message: "The end date is before the start date." };
  const isDemo = (await getMode()) === "demo";
  const inserted = await db
    .insert(observationCycles)
    .values({ ...c, label: `${isDemo ? "Demo · " : ""}Term ${c.term}, Week ${c.week}`, isDemo })
    .onConflictDoNothing()
    .returning({ id: observationCycles.id });
  revalidatePath("/admin/setup");
  if (inserted.length === 0) return { ok: false, message: "That term and week already exist for this year." };
  return { ok: true, message: `Term ${c.term}, Week ${c.week} created. Add its schedule below.` };
}

export async function importScheduleAction(_prev: SetupState, formData: FormData): Promise<SetupState> {
  await requireAdmin();
  const cycleId = String(formData.get("cycleId") ?? "");
  const step = String(formData.get("step") ?? "preview");
  let text = String(formData.get("text") ?? "");
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 500_000) return { ok: false, message: "That file is too large for a schedule." };
    text = await file.text();
  }
  const cycle = await db.query.observationCycles.findFirst({ where: eq(observationCycles.id, cycleId) });
  if (!cycle) return { ok: false, message: "Choose the cycle this schedule belongs to.", text };
  if (!text.trim()) return { ok: false, message: "Paste the schedule table or choose a CSV file.", cycleId };
  const result = parseSchedule(text, cycle.startDate);
  const observerUsers = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "OBSERVER"));
  const observerByName = new Map(observerUsers.map((o) => [o.name.toLowerCase(), o.id]));
  const knownTeachers = new Set((await db.select({ name: teachers.name }).from(teachers)).map((t) => t.name.toLowerCase()));
  const preview = {
    rows: result.rows.map((r) => ({
      ...r,
      teacherIsNew: !knownTeachers.has(r.teacher.toLowerCase()),
      observerHasLogin: observerByName.has(r.observer.toLowerCase()),
    })),
    errors: result.errors,
  };
  if (step !== "import") {
    return {
      ok: true,
      message: `${preview.rows.length} visits read${preview.errors.length ? `, ${preview.errors.length} lines need fixing` : ""}. Check them, then import.`,
      preview,
      text,
      cycleId,
    };
  }
  if (preview.errors.length > 0) return { ok: false, message: "Fix the lines listed before importing.", preview, text, cycleId };
  const logins: NewLogin[] = [];
  let added = 0;
  for (const r of preview.rows) {
    const { teacherId, created } = await ensureTeacher(r.teacher, r.className, r.subject);
    if (created) logins.push(created);
    const ins = await db
      .insert(visits)
      .values({
        cycleId,
        observerUserId: observerByName.get(r.observer.toLowerCase()) ?? null,
        observerName: r.observer,
        teacherId,
        className: r.className,
        subject: r.subject,
        date: r.date,
        period: r.period,
      })
      .onConflictDoNothing()
      .returning({ id: visits.id });
    added += ins.length;
  }
  revalidatePath("/admin");
  revalidatePath("/admin/setup");
  return {
    ok: true,
    message: `${added} visits imported into ${cycle.label}${added < preview.rows.length ? ` (${preview.rows.length - added} were already there)` : ""}.${logins.length ? ` ${logins.length} new teacher logins created; their temporary passwords are below and are shown only once.` : ""}`,
    logins,
  };
}

const personSchema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.enum(["TEACHER", "OBSERVER", "ADMIN"]),
  gradeBand: z.enum(["", "KG", "LOWER_PRIMARY", "UPPER_PRIMARY"]).optional(),
  subjects: z.string().max(200).optional(),
});

export async function addPersonAction(_prev: SetupState, formData: FormData): Promise<SetupState> {
  await requireAdmin();
  const parsed = personSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Enter a name and choose a role." };
  const p = parsed.data;
  const name = /^(ms|mrs|mr|dr|miss)\.?\s/i.test(p.name) ? p.name : `Ms. ${p.name}`;
  const { id, login } = await createLogin(name, p.role);
  if (p.role === "TEACHER" || p.role === "OBSERVER") {
    await db
      .insert(teachers)
      .values({
        name,
        userId: id,
        gradeBand: p.gradeBand ? p.gradeBand : null,
        subjects: (p.subjects ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      })
      .onConflictDoNothing();
  }
  revalidatePath("/admin");
  revalidatePath("/admin/setup");
  return { ok: true, message: `${name} added. Give them the username and temporary password below; it is shown only once.`, logins: [login] };
}

export async function changeRoleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = z.uuid().parse(formData.get("userId"));
  const role = z.enum(["TEACHER", "OBSERVER"]).parse(formData.get("role"));
  if (userId === admin.id) return;
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
  // Visits on the schedule under this person's name become theirs to record once they are an observer.
  if (role === "OBSERVER") {
    const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (u) await db.update(visits).set({ observerUserId: userId }).where(eq(visits.observerName, u.name));
  }
  revalidatePath("/admin/setup");
  revalidatePath("/admin");
}

export async function saveRubricAction(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const admin = await requireAdmin();
  const criterionId = z.coerce.number().int().parse(formData.get("criterionId"));
  const criterion = await db.query.rubricCriteria.findFirst({ where: eq(rubricCriteria.id, criterionId) });
  if (!criterion) return { ok: false, message: "Unknown criterion." };
  let changes = 0;
  const newName = String(formData.get("name") ?? "").trim();
  if (newName && newName !== criterion.name) {
    await db.insert(rubricEdits).values({ criterionId, level: null, oldText: criterion.name, newText: newName, editedByUserId: admin.id });
    await db.update(rubricCriteria).set({ name: newName }).where(eq(rubricCriteria.id, criterionId));
    changes += 1;
  }
  const current = await db.select().from(rubricDescriptors).where(eq(rubricDescriptors.criterionId, criterionId));
  for (const d of current) {
    const next = String(formData.get(`level-${d.level}`) ?? "").trim();
    if (next && next !== d.text) {
      await db.insert(rubricEdits).values({ criterionId, level: d.level, oldText: d.text, newText: next, editedByUserId: admin.id });
      await db
        .update(rubricDescriptors)
        .set({ text: next })
        .where(and(eq(rubricDescriptors.criterionId, criterionId), eq(rubricDescriptors.level, d.level)));
      changes += 1;
    }
  }
  revalidatePath("/admin/rubric");
  return { ok: true, message: changes ? "Saved." : "Nothing changed." };
}
