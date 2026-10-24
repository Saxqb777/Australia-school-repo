import type { Metadata } from "next";
import Link from "next/link";
import { scheduleWorkshopAction, introducePairAction } from "@/app/actions/workshop-actions";
import { AppShell, PageHeading } from "@/components/AppShell";
import { GuidedTour, ReplayTourButton } from "@/components/GuidedTour";
import { Heatmap, LevelLegend, ScaleStrip } from "@/components/dashboard/Heatmap";
import { filtersToQuery, loadDashboard, parseFilters } from "@/lib/dashboard";
import { levelLabel, type Level } from "@/lib/judgement";
import { getMode } from "@/lib/mode";
import { GRADE_BAND_LABELS } from "@/lib/names";
import { requireUser } from "@/lib/session";
import { DASHBOARD_TOUR } from "@/lib/tours";

export const metadata: Metadata = { title: "Dashboard" };

function nextWeekday(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser(["ADMIN", "OBSERVER"]);
  const demo = (await getMode()) === "demo";
  const filters = parseFilters(await searchParams);
  const data = await loadDashboard(demo, filters);
  const isAdmin = user.role === "ADMIN";
  const areaOrder = [...data.rubric].sort((a, b) => (data.areaMean.get(b.id) ?? 0) - (data.areaMean.get(a.id) ?? 0));
  const expertCount = new Set([...data.experts.values()].flat().map((t) => t.teacherId)).size;
  const flaggedCount = new Set([...data.flagged.values()].flat().map((t) => t.teacherId)).size;
  const select = "field !py-2 !text-sm";

  return (
    <AppShell user={user} active="dashboard" wide>
      <PageHeading eyebrow="Whole school" title="Dashboard">
        <ReplayTourButton />
        <a href={`/api/export/dashboard${filtersToQuery(filters)}`} className="btn btn-quiet !min-h-9 !px-3 !text-sm" data-tour="dash-export">
          Export to Excel
        </a>
      </PageHeading>

      <form className="mt-4 grid gap-2 sm:grid-cols-5" data-tour="dash-filters" aria-label="Filters">
        <label className="text-xs text-ink-soft">
          Cycle
          <select name="cycle" defaultValue={filters.cycleId ?? ""} className={select}>
            <option value="">All cycles (latest per teacher)</option>
            {data.options.cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-soft">
          Observer
          <select name="observer" defaultValue={filters.observerUserId ?? ""} className={select}>
            <option value="">All observers</option>
            {data.options.observers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-soft">
          Subject
          <select name="subject" defaultValue={filters.subject ?? ""} className={select}>
            <option value="">All subjects</option>
            {data.options.subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-soft">
          Grade band
          <select name="band" defaultValue={filters.gradeBand ?? ""} className={select}>
            <option value="">KG to Grade 5</option>
            {Object.entries(GRADE_BAND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-primary !min-h-10 flex-1">
            Apply
          </button>
          <Link href="/dashboard" className="btn btn-quiet !min-h-10">
            Clear
          </Link>
        </div>
      </form>

      {data.latest.length === 0 ? (
        <div className="mt-10 max-w-xl border-l-2 border-navy pl-4">
          <h2 className="font-cond text-xl font-semibold">No completed observations match</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            The dashboard is built from observations marked complete. As Ms. Ayan and Ms. Marwa complete their visits, the
            school averages, the teacher by criterion grid and the workshop suggestions fill in here. Try clearing the filters.
          </p>
        </div>
      ) : (
        <>
          <dl className="mt-6 grid grid-cols-2 border-l border-t border-rule bg-sheet sm:grid-cols-5" data-tour="dash-stats">
            {[
              ["Observations", String(data.facts.length)],
              ["Teachers", String(data.latest.length)],
              ["School overall", data.overallMean !== null ? levelLabel(Math.min(6, Math.max(1, Math.floor(data.overallMean + 0.5))) as Level) : "—"],
              ["Experts", String(expertCount)],
              ["Need support", String(flaggedCount)],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-r border-rule px-4 py-3">
                <dt className="label-caps">{label}</dt>
                <dd className="mt-1 font-cond text-2xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-10 grid gap-8 lg:grid-cols-2" aria-label="School averages">
            <div data-tour="dash-areas">
              <h2 className="font-cond text-xl font-semibold text-navy">School average by area</h2>
              <p className="mt-1 text-sm text-ink-soft">Weakest first. Marker on the form&rsquo;s scale; left is Outstanding.</p>
              <ul className="mt-3 space-y-3">
                {areaOrder.map((a) => (
                  <li key={a.id}>
                    <p className="text-sm font-medium">{a.name}</p>
                    <ScaleStrip mean={data.areaMean.get(a.id) ?? null} label={a.name} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-cond text-xl font-semibold text-navy">School average by criterion</h2>
              <p className="mt-1 text-sm text-ink-soft">All 20 criteria, in the form&rsquo;s order.</p>
              <ul className="mt-3 space-y-1.5">
                {data.rubric.flatMap((a) =>
                  a.criteria.map((c) => (
                    <li key={c.id} className="grid grid-cols-[2.5rem_1fr] items-center gap-2">
                      <abbr title={c.name} className="font-mono text-xs text-ink-soft no-underline">
                        {c.code}
                      </abbr>
                      <ScaleStrip mean={data.criterionMean.get(c.id) ?? null} label={`${c.code} ${c.name}`} />
                    </li>
                  )),
                )}
              </ul>
            </div>
          </section>

          <section className="mt-12" aria-labelledby="heat-h" data-tour="dash-heatmap">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <h2 id="heat-h" className="font-cond text-xl font-semibold text-navy">
                  Every teacher against every criterion
                </h2>
                <p className="mt-1 text-sm text-ink-soft">Each teacher&rsquo;s latest observation in this view. Hover or tab to a cell for the criterion.</p>
              </div>
              <div className="ml-auto">
                <LevelLegend />
              </div>
            </div>
            <div className="mt-3">
              <Heatmap rubric={data.rubric} latest={data.latest} />
            </div>
          </section>

          <section className="mt-12 grid gap-8 lg:grid-cols-2" aria-label="Experts and support" data-tour="dash-insights">
            <div>
              <h2 className="font-cond text-xl font-semibold text-navy">Experts by area</h2>
              <p className="mt-1 text-sm text-ink-soft">Very Good or Outstanding in the area at their latest observation.</p>
              <dl className="mt-3 divide-y divide-rule border-y border-rule">
                {data.rubric.map((a) => (
                  <div key={a.id} className="grid gap-1 py-2 sm:grid-cols-[14rem_1fr]">
                    <dt className="text-sm font-medium">{a.name}</dt>
                    <dd className="text-sm">
                      {(data.experts.get(a.id) ?? []).length === 0 ? (
                        <span className="text-ink-faint">None yet</span>
                      ) : (
                        (data.experts.get(a.id) ?? []).map((t, i) => (
                          <span key={t.teacherId}>
                            {i > 0 ? ", " : ""}
                            <Link href={`/teachers/${t.teacherId}`} className="hover:underline">
                              {t.teacherName}
                            </Link>
                          </span>
                        ))
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h2 className="font-cond text-xl font-semibold text-navy">Teachers needing support</h2>
              <p className="mt-1 text-sm text-ink-soft">Acceptable or below in the area at their latest observation.</p>
              <dl className="mt-3 divide-y divide-rule border-y border-rule">
                {data.rubric.map((a) => (
                  <div key={a.id} className="grid gap-1 py-2 sm:grid-cols-[14rem_1fr]">
                    <dt className="text-sm font-medium">{a.name}</dt>
                    <dd className="text-sm">
                      {(data.flagged.get(a.id) ?? []).length === 0 ? (
                        <span className="text-ink-faint">None</span>
                      ) : (
                        (data.flagged.get(a.id) ?? []).map((t, i) => (
                          <span key={t.teacherId}>
                            {i > 0 ? ", " : ""}
                            <Link href={`/teachers/${t.teacherId}`} className="hover:underline">
                              {t.teacherName}
                            </Link>{" "}
                            <span className="text-ink-faint">({levelLabel(t.level)})</span>
                          </span>
                        ))
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="mt-12" aria-labelledby="plan-h" data-tour="dash-plan">
            <h2 id="plan-h" className="font-cond text-xl font-semibold text-navy">
              Suggested workshops
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-ink-soft">
              The weakest areas school-wide that have teachers needing support. Attendees are those teachers; leads are the
              area&rsquo;s strongest colleagues; the criteria are the area&rsquo;s weakest.
            </p>
            {data.plan.length === 0 ? (
              <p className="mt-3 text-ink-soft">No area has teachers at Acceptable or below in this view, so no workshop is suggested.</p>
            ) : (
              <ol className="mt-4 grid gap-4 lg:grid-cols-3">
                {data.plan.map((w, i) => (
                  <li key={w.areaId} className="flex flex-col border border-rule border-t-4 border-t-navy bg-sheet p-4">
                    <p className="label-caps">Suggestion {i + 1}</p>
                    <h3 className="mt-1 font-cond text-lg font-semibold">{w.areaName}</h3>
                    <p className="text-xs text-ink-soft">School mean {w.areaMean.toFixed(2)}</p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div>
                        <dt className="label-caps">Who should attend</dt>
                        <dd>{w.attendees.map((t) => t.teacherName).join(", ")}</dd>
                      </div>
                      <div>
                        <dt className="label-caps">Who should lead</dt>
                        <dd>{w.leads.length ? w.leads.map((t) => t.teacherName).join(", ") : "No colleague is rated Very Good or better here yet; consider an external facilitator."}</dd>
                      </div>
                      <div>
                        <dt className="label-caps">Criteria to cover</dt>
                        <dd>
                          <ul className="space-y-0.5">
                            {w.criteria.map((c) => (
                              <li key={c.code}>
                                <span className="font-mono text-xs text-ink-soft">{c.code}</span> {c.name}
                              </li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    </dl>
                    {isAdmin ? (
                      <details className="mt-4 border-t border-rule pt-3">
                        <summary className="cursor-pointer font-medium text-navy">Schedule this workshop</summary>
                        <form action={scheduleWorkshopAction} className="mt-3 space-y-2">
                          <input type="hidden" name="areaId" value={w.areaId} />
                          {w.attendees.map((t) => (
                            <input key={t.teacherId} type="hidden" name="attendeeIds" value={t.teacherId} />
                          ))}
                          {w.criteria.map((c) => (
                            <input key={c.code} type="hidden" name="criterionCodes" value={c.code} />
                          ))}
                          <label className="block text-xs text-ink-soft">
                            Title
                            <input name="title" className="field !py-2" defaultValue={w.title} required />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-xs text-ink-soft">
                              Date
                              <input name="date" type="date" className="field !py-2" defaultValue={nextWeekday(7)} required />
                            </label>
                            <label className="block text-xs text-ink-soft">
                              Time
                              <input name="time" type="time" className="field !py-2" defaultValue="14:30" />
                            </label>
                          </div>
                          <label className="block text-xs text-ink-soft">
                            Where
                            <input name="location" className="field !py-2" placeholder="Room or library" />
                          </label>
                          <label className="block text-xs text-ink-soft">
                            Lead
                            <select name="leadTeacherId" className="field !py-2" defaultValue={w.leads[0]?.teacherId ?? ""}>
                              <option value="">No lead from staff</option>
                              {w.leads.map((t) => (
                                <option key={t.teacherId} value={t.teacherId}>
                                  {t.teacherName}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button type="submit" className="btn btn-primary w-full">
                            Schedule and notify {w.attendees.length + (w.leads.length ? 1 : 0)} people
                          </button>
                        </form>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="mt-12" aria-labelledby="pairs-h" data-tour="dash-pairs">
            <h2 id="pairs-h" className="font-cond text-xl font-semibold text-navy">
              Peer pairing
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-ink-soft">
              Each teacher needing support in an area, matched with the strongest colleague there. Same grade band is
              preferred, and no colleague supports more than two people.
            </p>
            {data.pairs.length === 0 ? (
              <p className="mt-3 text-ink-soft">No pairs to suggest in this view.</p>
            ) : (
              <div className="mt-3 overflow-x-auto border border-rule bg-sheet">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead>
                    <tr className="bg-navy text-left text-white">
                      {["Teacher", "Area", "Paired with", ""].map((h, i) => (
                        <th key={i} scope="col" className="px-3 py-2 font-cond font-semibold">
                          {h || <span className="sr-only">Action</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.pairs.map((p) => (
                      <tr key={`${p.teacher.teacherId}-${p.areaId}`} className="border-t border-rule">
                        <td className="px-3 py-2">
                          {p.teacher.teacherName} <span className="text-ink-faint">({levelLabel(p.teacher.level)})</span>
                        </td>
                        <td className="px-3 py-2">{p.areaName}</td>
                        <td className="px-3 py-2">
                          {p.partner.teacherName} <span className="text-ink-faint">({levelLabel(p.partner.level)})</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {p.introducedAt ? (
                            <span className="text-ink-soft">Introduced</span>
                          ) : isAdmin ? (
                            <form action={introducePairAction}>
                              <input type="hidden" name="teacherId" value={p.teacher.teacherId} />
                              <input type="hidden" name="partnerId" value={p.partner.teacherId} />
                              <input type="hidden" name="areaId" value={p.areaId} />
                              <button type="submit" className="font-medium text-navy underline underline-offset-2">
                                Introduce
                              </button>
                            </form>
                          ) : (
                            <span className="text-ink-faint">Suggested</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      <GuidedTour tourKey="dashboard" steps={DASHBOARD_TOUR} autoStart={!user.toursCompleted.includes("dashboard")} />
    </AppShell>
  );
}
