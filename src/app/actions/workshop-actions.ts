"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { notifications, peerPairings, rubricAreas, teachers, workshopAttendees, workshops } from "@/db/schema";
import { getMode } from "@/lib/mode";
import { getCurrentUser } from "@/lib/session";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Only the administrator can do this.");
  return user;
}

async function notifyTeachers(teacherIds: string[], title: string, body: string, href: string, isDemo: boolean) {
  if (teacherIds.length === 0) return;
  const rows = await db.select({ id: teachers.id, userId: teachers.userId }).from(teachers);
  const wanted = new Set(teacherIds);
  const values = rows
    .filter((r) => wanted.has(r.id) && r.userId)
    .map((r) => ({ userId: r.userId as string, title, body, href, isDemo }));
  if (values.length > 0) await db.insert(notifications).values(values);
}

const scheduleSchema = z.object({
  areaId: z.coerce.number().int(),
  title: z.string().trim().min(3).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().max(20).optional(),
  location: z.string().max(200).optional(),
  leadTeacherId: z.string().optional(),
  attendeeIds: z.array(z.uuid()).min(1),
  criterionCodes: z.array(z.string().max(10)).max(20),
});

/** Turns a suggested workshop into a scheduled one and tells every attendee and the lead in the app. */
export async function scheduleWorkshopAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const parsed = scheduleSchema.safeParse({
    areaId: formData.get("areaId"),
    title: formData.get("title"),
    date: formData.get("date"),
    time: formData.get("time") || undefined,
    location: formData.get("location") || undefined,
    leadTeacherId: formData.get("leadTeacherId") || undefined,
    attendeeIds: formData.getAll("attendeeIds"),
    criterionCodes: formData.getAll("criterionCodes"),
  });
  if (!parsed.success) redirect("/dashboard?error=workshop");
  const d = parsed.data;
  const isDemo = (await getMode()) === "demo";
  const lead = d.leadTeacherId && z.uuid().safeParse(d.leadTeacherId).success ? d.leadTeacherId : null;
  const [w] = await db
    .insert(workshops)
    .values({
      title: d.title,
      areaId: d.areaId,
      leadTeacherId: lead,
      date: d.date,
      time: d.time ?? null,
      location: d.location ?? null,
      criterionCodes: d.criterionCodes,
      isDemo,
      createdByUserId: user.id,
    })
    .returning({ id: workshops.id });
  if (!w) throw new Error("Workshop not created");
  await db.insert(workshopAttendees).values(d.attendeeIds.map((teacherId) => ({ workshopId: w.id, teacherId })));
  const when = `${new Date(`${d.date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}${d.time ? ` at ${d.time}` : ""}${d.location ? `, ${d.location}` : ""}`;
  await notifyTeachers(d.attendeeIds, `Workshop invitation: ${d.title}`, `You are invited to "${d.title}" on ${when}.`, "/my/workshops", isDemo);
  if (lead) {
    await notifyTeachers([lead], `You are leading: ${d.title}`, `Thank you for leading "${d.title}" on ${when}. Attendees have been told in the app.`, "/my/workshops", isDemo);
  }
  revalidatePath("/workshops");
  redirect(`/workshops#w-${w.id}`);
}

/** Records attendance and completes, or cancels, a workshop. */
export async function updateWorkshopAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.uuid().parse(formData.get("workshopId"));
  const action = z.enum(["complete", "cancel", "reopen"]).parse(formData.get("action"));
  if (action === "complete") {
    const present = new Set(formData.getAll("present").map(String));
    const attendees = await db.select().from(workshopAttendees).where(eq(workshopAttendees.workshopId, id));
    for (const a of attendees) {
      await db
        .update(workshopAttendees)
        .set({ attended: present.has(a.teacherId) })
        .where(and(eq(workshopAttendees.workshopId, id), eq(workshopAttendees.teacherId, a.teacherId)));
    }
  }
  await db
    .update(workshops)
    .set({ status: action === "complete" ? "completed" : action === "cancel" ? "cancelled" : "scheduled" })
    .where(eq(workshops.id, id));
  revalidatePath("/workshops");
}

/** Introduces a teacher to a stronger colleague in one area, with an in-app notice to both. */
export async function introducePairAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const teacherId = z.uuid().parse(formData.get("teacherId"));
  const partnerId = z.uuid().parse(formData.get("partnerId"));
  const areaId = z.coerce.number().int().parse(formData.get("areaId"));
  const isDemo = (await getMode()) === "demo";
  const [t, p, area] = await Promise.all([
    db.query.teachers.findFirst({ where: eq(teachers.id, teacherId) }),
    db.query.teachers.findFirst({ where: eq(teachers.id, partnerId) }),
    db.query.rubricAreas.findFirst({ where: eq(rubricAreas.id, areaId) }),
  ]);
  if (!t || !p || !area) throw new Error("Unknown teacher or area");
  await db
    .insert(peerPairings)
    .values({ teacherId, partnerTeacherId: partnerId, areaId, introducedByUserId: user.id, isDemo })
    .onConflictDoNothing();
  await notifyTeachers(
    [teacherId],
    `Meet ${p.name}`,
    `${p.name} has strong practice in ${area.name}. You are paired to visit each other's lessons and share ideas.`,
    "/my/workshops",
    isDemo,
  );
  await notifyTeachers(
    [partnerId],
    `Supporting ${t.name}`,
    `Thank you for supporting ${t.name} in ${area.name}. Please arrange a lesson visit and a short conversation.`,
    "/my/workshops",
    isDemo,
  );
  revalidatePath("/dashboard");
}
