import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AppShell, PageHeading } from "@/components/AppShell";
import { db } from "@/db";
import { observationCycles, observations, ratingAudit, rubricAreas, rubricCriteria, teachers, users, visits } from "@/db/schema";
import { isLevel, levelLabel } from "@/lib/judgement";
import { getMode } from "@/lib/mode";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Audit log" };

const FIELD = { rating: "Rating", area_override: "Area judgement changed", overall_override: "Overall judgement changed" } as const;

function lvl(v: string | null): string {
  const n = v === null ? null : Number(v);
  return isLevel(n) ? levelLabel(n) : "none";
}

export default async function AuditPage() {
  const user = await requireUser(["ADMIN", "OBSERVER"]);
  const demo = (await getMode()) === "demo";
  const rows = await db
    .select({
      id: ratingAudit.id,
      field: ratingAudit.field,
      oldValue: ratingAudit.oldValue,
      newValue: ratingAudit.newValue,
      reason: ratingAudit.reason,
      changedAt: ratingAudit.changedAt,
      by: users.name,
      code: rubricCriteria.code,
      areaName: rubricAreas.name,
      teacher: teachers.name,
      visitId: visits.id,
      isDemo: observationCycles.isDemo,
    })
    .from(ratingAudit)
    .innerJoin(observations, eq(observations.id, ratingAudit.observationId))
    .innerJoin(visits, eq(visits.id, observations.visitId))
    .innerJoin(observationCycles, eq(observationCycles.id, visits.cycleId))
    .innerJoin(teachers, eq(teachers.id, visits.teacherId))
    .leftJoin(users, eq(users.id, ratingAudit.changedByUserId))
    .leftJoin(rubricCriteria, eq(rubricCriteria.id, ratingAudit.criterionId))
    .leftJoin(rubricAreas, eq(rubricAreas.id, ratingAudit.areaId))
    .where(eq(observationCycles.isDemo, demo))
    .orderBy(desc(ratingAudit.changedAt))
    .limit(300);
  return (
    <AppShell user={user} active="audit" wide>
      <PageHeading eyebrow="Every rating change" title="Audit log" />
      <p className="mt-4 max-w-3xl text-sm text-ink-soft">
        Each time a rating or a judgement is set, changed or cleared, the old value, the new value, who did it and when are
        kept here. The latest 300 changes are shown; the full log is in the database.
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 border-l-2 border-navy pl-3 text-ink-soft">No rating changes recorded yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-rule bg-sheet">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="bg-navy text-left text-white">
                {["When (UAE)", "By", "Teacher", "What", "From", "To", "Reason"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-cond font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-rule align-top">
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs">
                    {r.changedAt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Dubai" })}
                  </td>
                  <td className="px-3 py-1.5">{r.by ?? "Unknown"}</td>
                  <td className="px-3 py-1.5">
                    <Link href={`/observe/${r.visitId}`} className="link">
                      {r.teacher}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5">
                    {r.field === "rating" ? `${r.code ?? ""}` : r.field === "area_override" ? `${FIELD.area_override}: ${r.areaName ?? ""}` : FIELD.overall_override}
                  </td>
                  <td className="px-3 py-1.5 text-ink-soft">{lvl(r.oldValue)}</td>
                  <td className="px-3 py-1.5 font-medium">{lvl(r.newValue)}</td>
                  <td className="px-3 py-1.5 text-ink-soft">{r.reason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
