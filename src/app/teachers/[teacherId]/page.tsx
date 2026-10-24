import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AppShell, PageHeading } from "@/components/AppShell";
import { LEVEL_FILL } from "@/components/dashboard/levels";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { criterionDeltas } from "@/lib/analytics";
import { dayMonth } from "@/lib/dates";
import { levelLabel, levelShort, type Level } from "@/lib/judgement";
import { getMode } from "@/lib/mode";
import { GRADE_BAND_LABELS } from "@/lib/names";
import { getRubric, loadFacts } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { listPairingsFor, listWorkshops } from "@/lib/workshops";

export const metadata: Metadata = { title: "Teacher progress" };

function Chip({ level }: { level: Level | null }) {
  if (!level) return <span className="text-ink-faint">·</span>;
  const f = LEVEL_FILL[level];
  return (
    <span className="inline-grid h-6 min-w-8 place-items-center px-1 font-cond text-xs font-semibold" style={{ background: f.bg, color: f.fg }} title={levelLabel(level)}>
      {levelShort(level)}
    </span>
  );
}

export default async function TeacherProgressPage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = await params;
  const user = await requireUser(["ADMIN", "OBSERVER"]);
  if (!z.uuid().safeParse(teacherId).success) notFound();
  const teacher = await db.query.teachers.findFirst({ where: eq(teachers.id, teacherId) });
  if (!teacher) notFound();
  const demo = (await getMode()) === "demo";
  const rubric = await getRubric();
  const [facts, allFacts] = await Promise.all([loadFacts(rubric, { demo, teacherId }), loadFacts(rubric, { demo })]);
  const workshops = await listWorkshops(demo, allFacts, teacherId);
  const pairs = await listPairingsFor(demo, teacherId);
  const last = facts[facts.length - 1];
  const prev = facts[facts.length - 2];
  const deltas = prev && last ? criterionDeltas(prev, last, rubric.flatMap((a) => a.criteria.map((c) => c.id))) : [];
  const deltaById = new Map(deltas.map((d) => [d.criterionId, d]));
  const improved = deltas.filter((d) => (d.change ?? 0) > 0).length;
  const declined = deltas.filter((d) => (d.change ?? 0) < 0).length;

  return (
    <AppShell user={user} active="teachers" wide>
      <PageHeading
        eyebrow={[teacher.gradeBand ? GRADE_BAND_LABELS[teacher.gradeBand] : null, teacher.subjects.join(", ")].filter(Boolean).join(" · ")}
        title={teacher.name}
      />
      {facts.length === 0 ? (
        <p className="mt-8 max-w-xl border-l-2 border-navy pl-4 text-ink-soft">
          No completed observations for {teacher.name} yet. Each completed observation adds a column here, and from the second
          one on, the change on every criterion is shown.
        </p>
      ) : (
        <>
          {prev && last ? (
            <p className="mt-4 text-ink">
              Since {prev.cycleLabel}: <strong>{improved}</strong> criteria improved, <strong>{declined}</strong> went down,{" "}
              {deltas.length - improved - declined} the same.
            </p>
          ) : (
            <p className="mt-4 text-ink-soft">One completed observation so far. The change on each criterion appears after the next one.</p>
          )}
          <div className="mt-4 overflow-x-auto border border-rule bg-sheet">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="bg-navy text-left text-white">
                  <th scope="col" className="px-3 py-2 font-cond font-semibold">
                    Criterion
                  </th>
                  {facts.map((f) => (
                    <th key={f.observationId} scope="col" className="px-2 py-2 text-center font-cond font-semibold">
                      <Link href={`/observe/${f.visitId}`} className="underline-offset-2 hover:underline">
                        {f.cycleLabel}
                      </Link>
                      <span className="block text-[0.7rem] font-normal opacity-80">{dayMonth(f.date)}</span>
                    </th>
                  ))}
                  {prev ? (
                    <th scope="col" className="px-3 py-2 text-center font-cond font-semibold">
                      Change
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rubric.map((a) => (
                  <Fragment key={a.id}>
                    <tr className="bg-navy-wash">
                      <th scope="rowgroup" colSpan={facts.length + 2} className="px-3 py-1.5 text-left font-cond text-xs font-semibold uppercase tracking-wide">
                        {a.position}. {a.name}
                      </th>
                    </tr>
                    {a.criteria.map((c) => {
                      const d = deltaById.get(c.id);
                      return (
                        <tr key={c.id} className="border-t border-rule">
                          <th scope="row" className="px-3 py-1.5 text-left font-normal">
                            <span className="font-mono text-xs text-ink-faint">{c.code}</span> {c.name}
                          </th>
                          {facts.map((f) => (
                            <td key={f.observationId} className="px-2 py-1.5 text-center">
                              <Chip level={f.ratings.get(c.id) ?? null} />
                            </td>
                          ))}
                          {prev ? (
                            <td className="px-3 py-1.5 text-center">
                              {d?.change === null || d?.change === undefined ? (
                                <span className="text-ink-faint">·</span>
                              ) : d.change > 0 ? (
                                <span className="font-semibold text-navy">▲ {d.change}</span>
                              ) : d.change < 0 ? (
                                <span className="text-ink-soft">▼ {-d.change}</span>
                              ) : (
                                <span className="text-ink-faint">same</span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
                <tr className="border-t-2 border-navy">
                  <th scope="row" className="px-3 py-2 text-left font-semibold">
                    Overall Lesson Judgement
                  </th>
                  {facts.map((f) => (
                    <td key={f.observationId} className="px-2 py-2 text-center">
                      <Chip level={f.overall} />
                    </td>
                  ))}
                  {prev ? <td /> : null}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-soft">▲ improved by that many levels; ▼ went down. Levels run from Outstanding (O) to Very Weak (VW).</p>
        </>
      )}

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-cond text-xl font-semibold text-navy">Workshops</h2>
          {workshops.length === 0 ? (
            <p className="mt-2 text-ink-soft">Not invited to, or leading, any workshop yet.</p>
          ) : (
            <ul className="mt-2 border-t border-rule text-sm">
              {workshops.map((w) => {
                const me = w.attendees.find((x) => x.teacherId === teacherId);
                return (
                  <li key={w.id} className="border-b border-rule py-2.5">
                    <Link href={`/workshops#w-${w.id}`} className="font-medium hover:underline">
                      {w.title}
                    </Link>
                    <span className="block text-ink-soft">
                      {w.leadTeacherId === teacherId ? "Leading" : me?.attended ? "Attended" : me?.attended === false ? "Absent" : "Invited"} ·{" "}
                      {dayMonth(w.date)}
                      {me?.effect && me.effect.change !== null
                        ? ` · ${w.areaName}: ${me.effect.before ? levelLabel(me.effect.before) : ""} → ${me.effect.after ? levelLabel(me.effect.after) : ""}${me.effect.change > 0 ? ", improved" : me.effect.change < 0 ? ", went down" : ", no change"}`
                        : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <h2 className="font-cond text-xl font-semibold text-navy">Colleague pairing</h2>
          {pairs.length === 0 ? (
            <p className="mt-2 text-ink-soft">No pairing yet.</p>
          ) : (
            <ul className="mt-2 border-t border-rule text-sm">
              {pairs.map((p) => (
                <li key={p.id} className="border-b border-rule py-2.5">
                  {p.role === "supported" ? `Supported by ${p.otherName}` : `Supporting ${p.otherName}`} in {p.areaName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  );
}
