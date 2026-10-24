import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, isNotNull } from "drizzle-orm";
import { AppShell, PageHeading } from "@/components/AppShell";
import { GuidedTour, ReplayTourButton } from "@/components/GuidedTour";
import { db } from "@/db";
import { observationCycles, observations, visits } from "@/db/schema";
import { fullDate } from "@/lib/dates";
import { getMode } from "@/lib/mode";
import { requireUser } from "@/lib/session";
import { TEACHER_TOUR } from "@/lib/tours";

export const metadata: Metadata = { title: "My observations" };

export default async function TeacherHome() {
  const user = await requireUser(["TEACHER"]);
  const demo = (await getMode()) === "demo";
  const rows = user.teacherId
    ? await db
        .select({
          visitId: visits.id,
          date: visits.date,
          className: visits.className,
          subject: visits.subject,
          observerName: visits.observerName,
          cycleLabel: observationCycles.label,
          sharedAt: observations.sharedAt,
          signedAt: observations.signedByTeacherAt,
        })
        .from(observations)
        .innerJoin(visits, eq(visits.id, observations.visitId))
        .innerJoin(observationCycles, eq(observationCycles.id, visits.cycleId))
        .where(and(eq(visits.teacherId, user.teacherId), isNotNull(observations.sharedAt), eq(observationCycles.isDemo, demo)))
        .orderBy(visits.date)
    : [];
  rows.reverse();

  return (
    <AppShell user={user} active="my">
      <PageHeading eyebrow={user.name} title="My observations">
        <span data-tour="replay">
          <ReplayTourButton />
        </span>
      </PageHeading>
      {rows.length === 0 ? (
        <div className="mt-8 max-w-xl border-l-2 border-navy pl-4">
          <h2 className="font-cond text-xl font-semibold">Nothing shared with you yet</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            After an observer completes your lesson observation and shares it, it will appear here with your ratings on the
            school&rsquo;s Teacher Observation Form and the observer&rsquo;s feedback. You can sign it and write a short
            reflection in reply.
          </p>
        </div>
      ) : (
        <ul className="mt-6 border-t border-rule" data-tour="my-list">
          {rows.map((r) => (
            <li key={r.visitId} className="border-b border-rule">
              <Link href={`/my/${r.visitId}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-4 hover:bg-navy-wash sm:px-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {r.subject} · {r.className}
                  </span>
                  <span className="block text-sm text-ink-soft">
                    {fullDate(r.date)} · {r.observerName} · {r.cycleLabel}
                  </span>
                </span>
                <span className="text-sm">{r.signedAt ? "Signed" : <span className="font-semibold text-navy">New: read and sign</span>}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm">
        <Link href="/change-password" className="link">
          Change my password
        </Link>
      </p>
      <GuidedTour tourKey="teacher" steps={TEACHER_TOUR} autoStart={!user.toursCompleted.includes("teacher")} />
    </AppShell>
  );
}
