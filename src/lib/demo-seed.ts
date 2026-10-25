import "server-only";
import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {

  appSettings,
  digests,
  feedbackDeliveries,
  notifications,
  observationCycles,
  observationRatings,
  observations,
  peerFiles,
  peerObservations,
  peerPairings,
  ratingAudit,
  rubricAreas,
  rubricCriteria,
  rubricDescriptors,
  teacherReflections,
  teachers,
  users,
  visits,
  workshopAttendees,
  workshops,
} from "@/db/schema";
import { DAY_DATES, SCHEDULE } from "@/db/seed-data/schedule";
import { levelLabel, type Level } from "./judgement";

/** Removes every piece of demo data. Real people, the rubric and the real schedule are untouched. */
export async function clearDemoData(): Promise<void> {
  await db.delete(notifications).where(eq(notifications.isDemo, true));
  await db.delete(peerPairings).where(eq(peerPairings.isDemo, true));
  await db.delete(workshops).where(eq(workshops.isDemo, true));
  await db.delete(digests).where(eq(digests.isDemo, true));
  await db.delete(observationCycles).where(eq(observationCycles.isDemo, true));
  const demoPeer = await db.select({ fileId: peerObservations.fileId }).from(peerObservations).where(eq(peerObservations.isDemo, true));
  await db.delete(peerObservations).where(eq(peerObservations.isDemo, true));
  const fileIds = demoPeer.map((r) => r.fileId).filter((id): id is string => id !== null);
  if (fileIds.length > 0) await db.delete(peerFiles).where(inArray(peerFiles.id, fileIds));
}

function hashInt(s: string): number {
  return createHash("sha256").update(s).digest().readUInt32BE(0);
}

const clamp = (n: number): Level => Math.min(6, Math.max(1, Math.round(n))) as Level;

const WEEK4 = { monday: "2026-09-28", start: "2026-09-28", end: "2026-10-02" };
const WEEK10 = { start: DAY_DATES.Monday, end: DAY_DATES.Friday };

const TOPICS: Record<string, string[]> = {
  English: ["Retelling a story in sequence", "Describing characters", "Persuasive sentences"],
  Math: ["Place value to 1,000", "Equivalent fractions", "Measuring length"],
  Science: ["Living and non-living things", "Forces: push and pull"],
  UOI: ["How we organise ourselves: communities", "Sharing the planet: habitats"],
  Arabic: ["القراءة الجهرية", "الكتابة الإبداعية"],
  Music: ["Rhythm and pulse", "Call and response songs"],
  PSPE: ["Balance and control", "Team games"],
  "Social Studies": ["Maps and places", "Then and now"],
  Islamic: ["Values in daily life", "Stories of the prophets"],
};

const COMMENTS: Record<"strong" | "secure" | "weak", string[]> = {
  strong: [
    "Open questions asked students to explain their reasoning, and most did so confidently.",
    "Students moved between tasks independently and used the success criteria to check their work.",
    "Clear routines meant very little time was lost between activities.",
  ],
  secure: [
    "Questions mostly checked understanding; a few invited students to explain why.",
    "Resources supported the task; a little more choice would extend the more able.",
  ],
  weak: [
    "Most students waited for teacher direction; few took the lead in their learning.",
    "The same task was given to all students, so some finished quickly while others needed more support.",
    "Assessment information from earlier lessons was not visible in the planning seen.",
  ],
};

function periodTime(p: number): string {
  const mins = 7 * 60 + 45 + (p - 1) * 50;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

interface Profile {
  base: number;
  areaOffset: Map<number, number>;
}

function profileFor(teacher: string, areaIds: number[]): Profile {
  const h = hashInt(teacher);
  // A spread of teachers: a few very strong, most good, some needing support.
  const bases = [1.9, 2.3, 2.6, 2.8, 2.9, 3.0, 3.1, 3.5];
  const base = bases[h % bases.length] ?? 3;
  const areaOffset = new Map<number, number>();
  for (const id of areaIds) areaOffset.set(id, ((hashInt(`${teacher}:${id}`) % 5) - 2) * 0.3);
  return { base, areaOffset };
}

/** Ratings for one demo observation. `boostArea` improves one area by a level (workshop effect). */
function ratingsFor(
  teacher: string,
  week: string,
  profile: Profile,
  criteria: { id: number; areaId: number }[],
  boostArea: number | null,
): Map<number, Level> {
  const out = new Map<number, Level>();
  for (const c of criteria) {
    const noise = ((hashInt(`${teacher}:${week}:${c.id}`) % 3) - 1) * 0.5;
    const boost = boostArea === c.areaId ? -1 : week === "w10" ? -0.2 : 0;
    out.set(c.id, clamp(profile.base + (profile.areaOffset.get(c.areaId) ?? 0) + noise + boost));
  }
  return out;
}

function feedbackFor(
  teacherName: string,
  observerName: string,
  ranked: { name: string; level: Level; descriptor: string }[],
): { strengths: string; improvements: string; letter: string } {
  const top = ranked.slice(0, 4);
  const bottom = [...ranked].reverse().slice(0, 3);
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  const strengths = top.map((r) => `${r.name}: ${levelLabel(r.level)}. ${r.descriptor}`).join("\n");
  const improvements = bottom.map((r) => `Develop ${lower(r.name)}, currently ${levelLabel(r.level)}, towards the next level on the form.`).join("\n");
  const t1 = top[0];
  const t2 = top[1];
  const b1 = bottom[0];
  const b2 = bottom[1];
  const letter = [
    `Dear ${teacherName},`,
    "",
    `Thank you for welcoming me into your lesson. It was a pleasure to see your class at work, and I want to share what stood out and what could come next.`,
    "",
    `Your strongest area was ${lower(t1?.name ?? "your teaching")}, rated ${levelLabel(t1?.level ?? 3)}. ${t1?.descriptor ?? ""} I also noted ${lower(t2?.name ?? "your planning")}, rated ${levelLabel(t2?.level ?? 3)}, which gave students a secure base for their learning.`,
    "",
    `As a next step, I would encourage you to focus on ${lower(b1?.name ?? "differentiation")} and ${lower(b2?.name ?? "assessment")}. Small, regular changes here will help more students take ownership of their learning and show their progress clearly. I am happy to talk these through with you and to share ideas from colleagues.`,
    "",
    `Thank you again for your hard work and for the care you show your students.`,
    "",
    "Kind regards,",
    observerName,
  ].join("\n");
  return { strengths, improvements, letter };
}

export interface DemoSummary {
  cycles: number;
  visits: number;
  completed: number;
}

/** Builds a complete demo: an earlier week fully observed, the current week part-done, a workshop and pairings. */
export async function seedDemoData(): Promise<DemoSummary> {
  await clearDemoData();
  const [areas, criteriaRows, descriptorRows, teacherRows, userRows] = await Promise.all([
    db.select().from(rubricAreas),
    db.select().from(rubricCriteria),
    db.select().from(rubricDescriptors),
    db.select().from(teachers),
    db.select().from(users),
  ]);
  const areaIds = areas.map((a) => a.id).sort((a, b) => a - b);
  const criteria = criteriaRows.map((c) => ({ id: c.id, areaId: c.areaId, name: c.name, code: c.code }));
  const descriptor = new Map(descriptorRows.map((d) => [`${d.criterionId}:${d.level}`, d.text]));
  const teacherByName = new Map(teacherRows.map((t) => [t.name, t]));
  const ayan = userRows.find((u) => u.username === "ayan");
  const marwa = userRows.find((u) => u.username === "marwa");
  const admin = userRows.find((u) => u.role === "ADMIN");
  if (!ayan || !marwa || !admin) throw new Error("Seed the real users first");
  const observerFor = (name: string) => (name === "Ms. Ayan" ? ayan : name === "Ms. Marwa" ? marwa : null);

  const [c4] = await db
    .insert(observationCycles)
    .values({ academicYear: "2026–2027", term: 1, week: 4, label: "Demo · Term 1, Week 4", startDate: WEEK4.start, endDate: WEEK4.end, isDemo: true })
    .returning();
  const [c10] = await db
    .insert(observationCycles)
    .values({ academicYear: "2026–2027 (demo)", term: 1, week: 10, label: "Demo · Term 1, Week 10", startDate: WEEK10.start, endDate: WEEK10.end, isDemo: true })
    .returning();
  if (!c4 || !c10) throw new Error("Could not create demo cycles");

  const profiles = new Map(SCHEDULE.map((r) => [r.teacher, profileFor(r.teacher, areaIds)]));
  let visitCount = 0;
  let completed = 0;

  async function createObservation(opts: {
    cycleId: string;
    week: "w4" | "w10";
    date: string;
    row: (typeof SCHEDULE)[number];
    observer: { id: string; name: string };
    rated: number;
    complete: boolean;
    shared: boolean;
    teacherSigned: boolean;
    reflection: string | null;
    boostArea: number | null;
  }) {
    const teacher = teacherByName.get(opts.row.teacher);
    if (!teacher) throw new Error(`Missing teacher ${opts.row.teacher}`);
    const [visit] = await db
      .insert(visits)
      .values({
        cycleId: opts.cycleId,
        observerUserId: opts.observer.id,
        observerName: opts.observer.name,
        teacherId: teacher.id,
        className: opts.row.className,
        subject: opts.row.subject,
        date: opts.date,
        period: opts.row.period,
      })
      .returning({ id: visits.id });
    if (!visit) throw new Error("visit");
    visitCount += 1;
    if (opts.rated === 0) return visit.id;
    const profile = profiles.get(opts.row.teacher) ?? profileFor(opts.row.teacher, areaIds);
    const all = ratingsFor(opts.row.teacher, opts.week, profile, criteria, opts.boostArea);
    const chosen = criteria.slice(0, opts.rated);
    const ratings = new Map(chosen.map((c) => [c.id, all.get(c.id) as Level]));
    const ranked = chosen
      .map((c) => {
        const level = ratings.get(c.id) as Level;
        return { name: c.name, level, descriptor: descriptor.get(`${c.id}:${level}`) ?? "" };
      })
      .sort((a, b) => a.level - b.level);
    const fb = opts.complete ? feedbackFor(opts.row.teacher, opts.observer.name, ranked) : null;
    const topics = TOPICS[opts.row.subject] ?? ["Lesson"];
    const day = new Date(`${opts.date}T00:00:00Z`);
    const at = (h: number, m: number) => new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h - 4, m));
    const [obs] = await db
      .insert(observations)
      .values({
        visitId: visit.id,
        observedDate: opts.date,
        time: periodTime(opts.row.period),
        lengthOfObservation: "40 minutes",
        subject: opts.row.subject,
        topic: topics[hashInt(opts.row.teacher) % topics.length],
        numberOnRoll: 22,
        numberPresent: 20 + (hashInt(opts.row.teacher + opts.week) % 3),
        strengthsText: fb?.strengths ?? null,
        improvementsText: fb?.improvements ?? null,
        feedbackText: fb?.letter ?? null,
        status: opts.complete ? "complete" : "draft",
        completedAt: opts.complete ? at(15, 10) : null,
        summaryGeneratedAt: fb ? at(15, 0) : null,
        sharedAt: opts.shared ? at(15, 20) : null,
        signedByCoordinatorAt: opts.complete ? at(15, 15) : null,
        signedByCoordinatorName: opts.complete ? opts.observer.name : null,
        signedByTeacherAt: opts.teacherSigned ? at(18, 5) : null,
        signedByTeacherName: opts.teacherSigned ? opts.row.teacher : null,
      })
      .returning({ id: observations.id });
    if (!obs) throw new Error("observation");
    const bandOf = (l: Level) => (l <= 2 ? "strong" : l <= 3 ? "secure" : "weak");
    await db.insert(observationRatings).values(
      chosen.map((c, i) => {
        const level = ratings.get(c.id) as Level;
        const bank = COMMENTS[bandOf(level)];
        const withComment = hashInt(`${opts.row.teacher}:${opts.week}:c:${c.id}`) % 4 === 0;
        return {
          observationId: obs.id,
          criterionId: c.id,
          level,
          comment: withComment ? (bank[i % bank.length] ?? null) : null,
          levelClientTs: at(9, 0),
        };
      }),
    );
    if (opts.shared) {
      await db.insert(feedbackDeliveries).values({
        observationId: obs.id,
        channel: "portal",
        sentByUserId: opts.observer.id,
        sentAt: at(15, 20),
        openedAt: opts.teacherSigned ? at(17, 40) : null,
      });
    }
    if (opts.reflection) {
      await db.insert(teacherReflections).values({ observationId: obs.id, teacherId: teacher.id, text: opts.reflection });
    }
    if (opts.complete) completed += 1;
    return visit.id;
  }

  // Week 4: every teacher observed by Ms. Ayan or Ms. Marwa, all complete and shared.
  const dayOffset = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 } as const;
  const addDays = (iso: string, n: number) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  for (const [i, row] of SCHEDULE.entries()) {
    const observer = observerFor(row.observer) ?? (i % 2 === 0 ? ayan : marwa);
    await createObservation({
      cycleId: c4.id,
      week: "w4",
      date: addDays(WEEK4.monday, dayOffset[row.day]),
      row,
      observer,
      rated: 20,
      complete: true,
      shared: true,
      teacherSigned: hashInt(row.teacher) % 5 !== 0,
      reflection:
        hashInt(`${row.teacher}:r`) % 3 === 0
          ? "Thank you for the feedback. I will plan one differentiated task per lesson next week and ask a colleague to visit."
          : null,
      boostArea: null,
    });
  }

  // Week 4 analysis decides the workshop area: the weakest area school-wide.
  const w4Ratings = await db
    .select({ teacher: teachers.name, teacherId: teachers.id, criterionId: observationRatings.criterionId, level: observationRatings.level })
    .from(observationRatings)
    .innerJoin(observations, eq(observations.id, observationRatings.observationId))
    .innerJoin(visits, eq(visits.id, observations.visitId))
    .innerJoin(teachers, eq(teachers.id, visits.teacherId))
    .where(eq(visits.cycleId, c4.id));
  const areaOf = new Map(criteria.map((c) => [c.id, c.areaId]));
  const perTeacherArea = new Map<string, Map<number, number[]>>();
  for (const r of w4Ratings) {
    const m = perTeacherArea.get(r.teacherId) ?? new Map<number, number[]>();
    const a = areaOf.get(r.criterionId) ?? 0;
    m.set(a, [...(m.get(a) ?? []), r.level ?? 3]);
    perTeacherArea.set(r.teacherId, m);
  }
  const areaLevel = (teacherId: string, areaId: number) => {
    const v = perTeacherArea.get(teacherId)?.get(areaId) ?? [];
    return v.length ? Math.floor(v.reduce((s, x) => s + x, 0) / v.length + 0.5) : 3;
  };
  const areaMeanW4 = areaIds.map((id) => ({
    id,
    mean: [...perTeacherArea.keys()].reduce((s, t) => s + areaLevel(t, id), 0) / Math.max(1, perTeacherArea.size),
  }));
  areaMeanW4.sort((a, b) => b.mean - a.mean);
  const workshopArea = areaMeanW4[0]?.id ?? areaIds[0] ?? 1;
  const upcomingArea = areaMeanW4[1]?.id ?? areaIds[1] ?? 2;
  const flaggedIn = (areaId: number) => [...perTeacherArea.keys()].filter((t) => areaLevel(t, areaId) >= 4);
  const expertIn = (areaId: number) => [...perTeacherArea.keys()].filter((t) => areaLevel(t, areaId) <= 2);
  const attendees = flaggedIn(workshopArea);
  const lead = expertIn(workshopArea)[0] ?? null;

  const [done] = await db
    .insert(workshops)
    .values({
      title: `${areas.find((a) => a.id === workshopArea)?.name ?? "Workshop"}: next steps`,
      areaId: workshopArea,
      leadTeacherId: lead,
      date: "2026-10-14",
      time: "14:30",
      location: "Library",
      criterionCodes: criteria.filter((c) => c.areaId === workshopArea).map((c) => c.code),
      status: "completed",
      isDemo: true,
      createdByUserId: admin.id,
    })
    .returning({ id: workshops.id });
  if (done && attendees.length) {
    await db.insert(workshopAttendees).values(attendees.map((teacherId, i) => ({ workshopId: done.id, teacherId, attended: i % 4 !== 3 })));
  }
  const attendedNames = new Set(
    teacherRows.filter((t) => attendees.filter((_, i) => i % 4 !== 3).includes(t.id)).map((t) => t.name),
  );

  // Week 10: the real schedule. Ms. Ayan and Ms. Marwa part-way through the week; team leader visits not started.
  const plan: Record<string, { rated: number; complete: boolean; shared: boolean; signed: boolean }> = {
    "Ms. Cornelia": { rated: 20, complete: true, shared: true, signed: false },
    "Ms. Rana": { rated: 20, complete: true, shared: true, signed: true },
    "Ms. Mona": { rated: 20, complete: true, shared: false, signed: false },
    "Ms. Asmaa Aly": { rated: 8, complete: false, shared: false, signed: false },
    "Ms. Maha": { rated: 20, complete: true, shared: true, signed: true },
    "Ms. Shaheeda": { rated: 20, complete: true, shared: true, signed: false },
    "Ms. Hanan": { rated: 20, complete: true, shared: false, signed: false },
  };
  let featuredVisit: string | null = null;
  for (const row of SCHEDULE) {
    const observer = observerFor(row.observer);
    const p = plan[row.teacher];
    if (!observer || !p) {
      // Not started: an observer with a login opens it live during the demo; team leader visits stay as scheduled.
      const teacher = teacherByName.get(row.teacher);
      if (!teacher) continue;
      await db.insert(visits).values({
        cycleId: c10.id,
        observerUserId: observer?.id ?? null,
        observerName: row.observer,
        teacherId: teacher.id,
        className: row.className,
        subject: row.subject,
        date: DAY_DATES[row.day],
        period: row.period,
      });
      visitCount += 1;
      continue;
    }
    const id = await createObservation({
      cycleId: c10.id,
      week: "w10",
      date: DAY_DATES[row.day],
      row,
      observer,
      rated: p.rated,
      complete: p.complete,
      shared: p.shared,
      teacherSigned: p.signed,
      reflection: p.signed ? "Thank you. The workshop helped me plan clearer steps for different groups, and I can see the difference in how the class works." : null,
      boostArea: attendedNames.has(row.teacher) ? workshopArea : null,
    });
    if (row.teacher === "Ms. Cornelia") featuredVisit = id;
  }

  // An upcoming workshop for the second weakest area, and two colleague pairings.
  const upcomingAttendees = flaggedIn(upcomingArea);
  if (upcomingAttendees.length) {
    const [up] = await db
      .insert(workshops)
      .values({
        title: `${areas.find((a) => a.id === upcomingArea)?.name ?? "Workshop"}: next steps`,
        areaId: upcomingArea,
        leadTeacherId: expertIn(upcomingArea)[0] ?? null,
        date: "2026-11-18",
        time: "14:30",
        location: "Library",
        criterionCodes: criteria.filter((c) => c.areaId === upcomingArea).map((c) => c.code),
        status: "scheduled",
        isDemo: true,
        createdByUserId: admin.id,
      })
      .returning({ id: workshops.id });
    if (up) await db.insert(workshopAttendees).values(upcomingAttendees.map((teacherId) => ({ workshopId: up.id, teacherId })));
  }
  const expertsW = expertIn(workshopArea);
  for (const [i, t] of attendees.slice(0, 2).entries()) {
    const partner = expertsW[i % Math.max(1, expertsW.length)];
    if (partner && partner !== t) {
      await db.insert(peerPairings).values({ teacherId: t, partnerTeacherId: partner, areaId: workshopArea, introducedByUserId: admin.id, isDemo: true }).onConflictDoNothing();
    }
  }

  // Team leader observations: the schedule's team leaders, each with their own rating habit, kept apart from official data.
  const peerBias: Record<string, number> = {
    "Ms. Asmaa Aly": -0.8,
    "Ms. Cornelia": -0.4,
    "Ms. Rana": 0,
    "Ms. Riham": 0.6,
    "Ms. Walaa": -0.5,
    "Ms. Amira": 0.3,
    "Ms. Wafaa": -1,
  };
  const peerRows = SCHEDULE.filter((r) => !observerFor(r.observer));
  for (const [i, row] of peerRows.entries()) {
    const teacher = teacherByName.get(row.teacher);
    const observerTeacher = teacherByName.get(row.observer);
    if (!teacher) continue;
    const profile = profiles.get(row.teacher) ?? profileFor(row.teacher, areaIds);
    const levels = ratingsFor(row.teacher, "w10", profile, criteria, null);
    const ratings: Record<string, number> = {};
    for (const c of criteria) ratings[String(c.id)] = clamp((levels.get(c.id) ?? 3) + (peerBias[row.observer] ?? 0));
    const confirmed = i % 5 !== 4;
    await db.insert(peerObservations).values({
      observerTeacherId: observerTeacher?.id ?? null,
      observerName: row.observer,
      teacherId: teacher.id,
      teacherName: row.teacher,
      className: row.className,
      subject: row.subject,
      date: DAY_DATES[row.day],
      period: row.period,
      ratings,
      comments: {},
      strengths: "Positive relationships with the class.\nClear routines.",
      improvements: "Plan more challenge for those who finish early.",
      status: confirmed ? "confirmed" : "needs_check",
      uncertain: confirmed ? [] : ["1.3: the mark looks unclear; check the original."],
      isDemo: true,
      createdByUserId: ayan.id,
      confirmedByUserId: confirmed ? ayan.id : null,
      confirmedAt: confirmed ? new Date() : null,
    });
  }

  // A rating change in the audit log, and a few in-app notices.
  const sample = await db
    .select({ id: observations.id })
    .from(observations)
    .innerJoin(visits, eq(visits.id, observations.visitId))
    .where(and(eq(visits.cycleId, c10.id), eq(observations.status, "complete")))
    .limit(1);
  const firstCriterion = criteria[0];
  if (sample[0] && firstCriterion) {
    await db.insert(ratingAudit).values([
      { observationId: sample[0].id, criterionId: firstCriterion.id, field: "rating", oldValue: null, newValue: "3", changedByUserId: ayan.id },
      { observationId: sample[0].id, criterionId: firstCriterion.id, field: "rating", oldValue: "3", newValue: "2", changedByUserId: ayan.id },
    ]);
  }
  const cornelia = userRows.find((u) => u.username === "cornelia");
  const notes = [
    { userId: admin.id, title: "Welcome to the demo", body: "Sample ratings under real staff names show the full flow. Press Go live when the school is ready.", href: "/admin" },
    { userId: ayan.id, title: "Reflection from a teacher", body: "Ms. Rana replied to your feedback.", href: "/visits" },
    { userId: marwa.id, title: "Observation signed", body: "Ms. Maha has signed the observation of their PSPE lesson.", href: "/visits" },
  ];
  if (cornelia && featuredVisit) {
    notes.push({ userId: cornelia.id, title: "New lesson feedback", body: "Ms. Ayan has shared feedback on your English lesson with KG2A.", href: `/my/${featuredVisit}` });
  }
  await db.insert(notifications).values(notes.map((n) => ({ ...n, isDemo: true })));

  // Everyone sees the welcome story, the guided tours and an empty first-steps checklist again in the demo.
  await db.update(users).set({ toursCompleted: [] });
  await db.insert(appSettings).values({ key: "mode", value: "demo" }).onConflictDoNothing();
  return { cycles: 2, visits: visitCount, completed };
}

/** Go live: delete every piece of demo data, reset the tours and open password sign-in. */
export async function goLive(): Promise<void> {
  await clearDemoData();
  await db.update(users).set({ toursCompleted: [] });
  await db
    .insert(appSettings)
    .values({ key: "mode", value: "live" })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: "live", updatedAt: new Date() } });
}
