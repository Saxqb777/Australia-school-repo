import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { peerFiles, peerObservations, teachers } from "@/db/schema";
import { mean } from "./analytics";
import { levelFromName, readPeerForm, type PeerReading } from "./ai/read-documents";
import { isLevel, type Level } from "./judgement";
import { getRubric, loadFacts, type RubricArea } from "./queries";

export const MAX_PEER_FILE_BYTES = 4_000_000;

function normaliseName(n: string): string {
  return n
    .toLowerCase()
    .replace(/^(ms|mrs|mr|dr|miss)\.?\s+/, "")
    .replace(/[^a-z؀-ۿ ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Finds the staff member a handwritten or typed name refers to, only when the match is unambiguous. */
export function matchTeacher(name: string, people: { id: string; name: string }[]): string | null {
  const n = normaliseName(name);
  if (!n) return null;
  const exact = people.filter((p) => normaliseName(p.name) === n);
  if (exact.length === 1) return exact[0]?.id ?? null;
  const partial = people.filter((p) => {
    const q = normaliseName(p.name);
    return q.startsWith(n) || n.startsWith(q);
  });
  return partial.length === 1 ? (partial[0]?.id ?? null) : null;
}

function toRecord(reading: PeerReading, rubric: RubricArea[], people: { id: string; name: string }[]) {
  const byCode = new Map(rubric.flatMap((a) => a.criteria).map((c) => [c.code, c.id]));
  const ratings: Record<string, number> = {};
  const uncertain = [...reading.unsure];
  for (const r of reading.ratings) {
    const id = byCode.get(r.code.trim());
    const level = levelFromName(r.level);
    if (id && level) ratings[String(id)] = level;
    if (id && level && !r.sure) uncertain.push(`${r.code}: the mark looks unclear; check the original.`);
  }
  const comments: Record<string, string> = {};
  for (const c of reading.comments) {
    const id = byCode.get(c.code.trim());
    if (id && c.text.trim()) comments[String(id)] = c.text.trim();
  }
  const observerTeacherId = matchTeacher(reading.observerName, people);
  const teacherId = matchTeacher(reading.teacherName, people);
  if (!observerTeacherId) uncertain.push(`Observer "${reading.observerName || "blank"}" was not matched to a member of staff.`);
  if (!teacherId) uncertain.push(`Teacher observed "${reading.teacherName || "blank"}" was not matched to a member of staff.`);
  const missing = rubric.flatMap((a) => a.criteria).filter((c) => !ratings[String(c.id)]);
  if (missing.length > 0) uncertain.push(`${missing.length} criteria have no rating: ${missing.map((c) => c.code).join(", ")}.`);
  const period = Number.parseInt(reading.period, 10);
  return {
    observerTeacherId,
    observerName: reading.observerName.trim(),
    teacherId,
    teacherName: reading.teacherName.trim(),
    className: reading.className.trim() || null,
    subject: reading.subject.trim() || null,
    date: /^\d{4}-\d{2}-\d{2}$/.test(reading.date) ? reading.date : null,
    period: Number.isNaN(period) ? null : period,
    topic: reading.topic.trim() || null,
    ratings,
    comments,
    strengths: reading.strengths.trim() || null,
    improvements: reading.improvements.trim() || null,
    overallLevel: levelFromName(reading.overall),
    uncertain,
  };
}

/** Stores the original, reads it with AI, and creates a record waiting for a coordinator to check it. */
export async function createPeerFromFile(
  file: { name: string; type: string; data: Buffer },
  userId: string,
  isDemo: boolean,
): Promise<string> {
  const [rubric, people] = await Promise.all([getRubric(), db.select({ id: teachers.id, name: teachers.name }).from(teachers)]);
  const reading = await readPeerForm(file.data, file.type, rubric.flatMap((a) => a.criteria));
  const [stored] = await db
    .insert(peerFiles)
    .values({ fileName: file.name, mimeType: file.type, data: file.data })
    .returning({ id: peerFiles.id });
  const [row] = await db
    .insert(peerObservations)
    .values({ ...toRecord(reading, rubric, people), fileId: stored?.id ?? null, isDemo, createdByUserId: userId })
    .returning({ id: peerObservations.id });
  if (!row) throw new Error("Could not save the team leader observation");
  return row.id;
}

export type PeerRow = typeof peerObservations.$inferSelect;

export async function listPeer(demo: boolean): Promise<PeerRow[]> {
  return db.select().from(peerObservations).where(eq(peerObservations.isDemo, demo)).orderBy(desc(peerObservations.createdAt));
}

export async function getPeer(id: string, demo: boolean): Promise<PeerRow | null> {
  const row = await db.query.peerObservations.findFirst({ where: and(eq(peerObservations.id, id), eq(peerObservations.isDemo, demo)) });
  return row ?? null;
}

export function peerMean(row: Pick<PeerRow, "ratings">): number | null {
  return mean(Object.values(row.ratings).filter((v) => isLevel(v)));
}

export interface PeerRater {
  observerName: string;
  observerTeacherId: string | null;
  count: number;
  meanGiven: number | null;
  /** Average of (peer level − coordinators' level) on the same teacher and criterion. Negative = more generous. */
  difference: number | null;
  compared: number;
}

/**
 * How each team leader rates, against the coordinators' own latest observation of the same teachers.
 * Only confirmed team leader observations count.
 */
export async function peerRaters(demo: boolean): Promise<PeerRater[]> {
  const rows = (await listPeer(demo)).filter((r) => r.status === "confirmed");
  const rubric = await getRubric();
  const facts = await loadFacts(rubric, { demo });
  const latestOfficial = new Map<string, Map<number, Level>>();
  for (const f of facts) latestOfficial.set(f.teacherId, f.ratings as Map<number, Level>);
  const groups = new Map<string, PeerRow[]>();
  for (const r of rows) {
    const key = r.observerTeacherId ?? `name:${r.observerName}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()]
    .map((list) => {
      const given = list.flatMap((r) => Object.values(r.ratings).filter((v) => isLevel(v)));
      const diffs: number[] = [];
      for (const r of list) {
        const official = r.teacherId ? latestOfficial.get(r.teacherId) : undefined;
        if (!official) continue;
        for (const [cid, level] of Object.entries(r.ratings)) {
          const o = official.get(Number(cid));
          if (o && isLevel(level)) diffs.push(level - o);
        }
      }
      const first = list[0];
      return {
        observerName: first?.observerName ?? "",
        observerTeacherId: first?.observerTeacherId ?? null,
        count: list.length,
        meanGiven: mean(given),
        difference: mean(diffs),
        compared: diffs.length,
      };
    })
    .sort((a, b) => a.observerName.localeCompare(b.observerName));
}

/** Removes demo team leader observations and their files. */
export async function clearDemoPeer(): Promise<void> {
  const demoRows = await db.select({ fileId: peerObservations.fileId }).from(peerObservations).where(eq(peerObservations.isDemo, true));
  await db.delete(peerObservations).where(eq(peerObservations.isDemo, true));
  const fileIds = demoRows.map((r) => r.fileId).filter((id): id is string => id !== null);
  if (fileIds.length > 0) await db.delete(peerFiles).where(inArray(peerFiles.id, fileIds));
}
