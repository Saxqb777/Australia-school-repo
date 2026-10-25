import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, PageHeading } from "@/components/AppShell";
import { ExportMenu } from "@/components/ExportMenu";
import { GuidedTour, ReplayTourButton } from "@/components/GuidedTour";
import { StatusMark } from "@/components/StatusMark";
import { dateRange, dayMonth, weekdayName } from "@/lib/dates";
import { isDemoMode } from "@/lib/mode";
import { listVisits, type VisitListItem } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { VISITS_TOUR } from "@/lib/tours";

export const metadata: Metadata = { title: "My visits" };

export default async function VisitsPage() {
  const user = await requireUser(["OBSERVER", "ADMIN"]);
  const visits = await listVisits({ demo: await isDemoMode(), observerUserId: user.id });
  const byCycle = new Map<string, VisitListItem[]>();
  for (const v of visits) byCycle.set(v.cycleId, [...(byCycle.get(v.cycleId) ?? []), v]);
  const complete = visits.filter((v) => v.status === "complete").length;
  const inProgress = visits.filter((v) => v.status === "in_progress").length;
  const firstOpen = visits.find((v) => v.status !== "complete") ?? visits[0];

  return (
    <AppShell user={user} active="visits">
      <PageHeading eyebrow="Visitation schedule" title="My visits">
        <span data-tour="replay">
          <ReplayTourButton />
        </span>
        <ExportMenu scopeLabel="Everything: visits, ratings, judgements, feedback, teachers, logins (no passwords), rubric" />
      </PageHeading>

      {visits.length === 0 ? (
        <div className="mt-10 max-w-xl border-l-2 border-navy pl-4">
          <h2 className="font-cond text-xl font-semibold">No visits assigned to you yet</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            When the administrator adds a visitation schedule with you as the observer, your visits will appear here
            grouped by day, ready to open during the lesson.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-ink-soft" data-tour="status-key">
            <span className="font-mono text-ink">{visits.length}</span> visits ·{" "}
            <span className="font-mono text-ink">{complete}</span> complete ·{" "}
            <span className="font-mono text-ink">{inProgress}</span> in progress
          </p>
          <div className="mt-6 space-y-12" data-tour="week">
            {[...byCycle.entries()].map(([cycleId, cycleVisits]) => {
              const first = cycleVisits[0];
              const byDate = new Map<string, VisitListItem[]>();
              for (const v of cycleVisits) byDate.set(v.date, [...(byDate.get(v.date) ?? []), v]);
              return (
                <section key={cycleId} aria-label={first?.cycleLabel}>
                  {first ? (
                    <h2 className="font-cond text-xl font-semibold text-navy">
                      {first.cycleLabel} <span className="text-base font-normal text-ink-soft">· {dateRange(first.cycleStart, first.cycleEnd)}</span>
                    </h2>
                  ) : null}
                  <div className="mt-3 space-y-8">
                    {[...byDate.entries()].map(([date, dayVisits]) => (
                      <section key={date} aria-labelledby={`day-${cycleId}-${date}`}>
                        <h3 id={`day-${cycleId}-${date}`} className="flex items-baseline gap-3 border-b border-rule-strong pb-1.5">
                          <span className="font-cond text-lg font-semibold uppercase tracking-wide">{weekdayName(date)}</span>
                          <span className="text-sm text-ink-soft">{dayMonth(date)}</span>
                        </h3>
                        <ul>
                          {dayVisits.map((v) => (
                            <li key={v.id} className="border-b border-rule" data-tour={v.id === firstOpen?.id ? "first-visit" : undefined}>
                              <Link
                                href={`/observe/${v.id}`}
                                className="grid grid-cols-[3.25rem_1fr] items-center gap-x-3 gap-y-1 py-3.5 hover:bg-navy-wash sm:grid-cols-[4rem_1fr_auto] sm:px-2"
                              >
                                <span className="row-span-2 font-mono text-sm text-ink-soft sm:row-span-1">
                                  <span className="label-caps !text-[0.6rem]">Period</span>
                                  <span className="block text-xl leading-none text-ink">{v.period}</span>
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">{v.teacherName}</span>
                                  <span className="block text-sm text-ink-soft">
                                    {v.className} · {v.subject}
                                    {v.shared ? " · Shared with teacher" : ""}
                                  </span>
                                </span>
                                <span className="sm:justify-self-end">
                                  <StatusMark status={v.status} ratedCount={v.ratedCount} />
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
      <GuidedTour tourKey="visits" steps={VISITS_TOUR} autoStart={!user.toursCompleted.includes("visits")} />
    </AppShell>
  );
}
