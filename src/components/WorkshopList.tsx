import { updateWorkshopAction } from "@/app/actions/workshop-actions";
import { levelLabel } from "@/lib/judgement";
import type { WorkshopView } from "@/lib/workshops";

function dateText(d: string, t: string | null) {
  return `${new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}${t ? ` · ${t}` : ""}`;
}

const STATUS = { scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled" } as const;

export function WorkshopList({ items, admin }: { items: WorkshopView[]; admin: boolean }) {
  return (
    <ol className="mt-6 space-y-6">
      {items.map((w) => (
        <li key={w.id} id={`w-${w.id}`} className="scroll-mt-20 border border-rule bg-sheet">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule px-4 py-3">
            <h2 className="font-cond text-lg font-semibold">{w.title}</h2>
            <span className="text-sm text-ink-soft">{w.areaName}</span>
            <span className={`ml-auto label-caps ${w.status === "scheduled" ? "!text-navy" : ""}`}>{STATUS[w.status]}</span>
          </div>
          <div className="grid gap-4 px-4 py-3 text-sm sm:grid-cols-3">
            <dl className="space-y-1.5">
              <div>
                <dt className="label-caps">When</dt>
                <dd>{dateText(w.date, w.time)}</dd>
              </div>
              {w.location ? (
                <div>
                  <dt className="label-caps">Where</dt>
                  <dd>{w.location}</dd>
                </div>
              ) : null}
              <div>
                <dt className="label-caps">Lead</dt>
                <dd>{w.leadName ?? "No lead from staff"}</dd>
              </div>
              {w.criterionCodes.length ? (
                <div>
                  <dt className="label-caps">Criteria</dt>
                  <dd className="font-mono text-xs">{w.criterionCodes.join(", ")}</dd>
                </div>
              ) : null}
            </dl>
            <div className="sm:col-span-2">
              <p className="label-caps">Attendees</p>
              {admin && w.status === "scheduled" ? (
                <form action={updateWorkshopAction} className="mt-1">
                  <input type="hidden" name="workshopId" value={w.id} />
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {w.attendees.map((a) => (
                      <li key={a.teacherId}>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name="present" value={a.teacherId} defaultChecked className="size-4 accent-[#0a3655]" />
                          {a.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="submit" name="action" value="complete" className="btn btn-primary !min-h-9 !text-sm">
                      Record attendance and complete
                    </button>
                    <button type="submit" name="action" value="cancel" className="btn btn-quiet !min-h-9 !text-sm">
                      Cancel workshop
                    </button>
                  </div>
                </form>
              ) : (
                <table className="mt-1 w-full">
                  <tbody>
                    {w.attendees.map((a) => (
                      <tr key={a.teacherId} className="border-b border-rule last:border-0">
                        <td className="py-1.5 pr-2">{a.name}</td>
                        <td className="py-1.5 pr-2 text-ink-soft">
                          {a.attended === null ? (w.status === "scheduled" ? "Invited" : "") : a.attended ? "Attended" : "Absent"}
                        </td>
                        <td className="py-1.5 text-right">
                          {a.effect ? (
                            a.effect.change === null ? (
                              <span className="text-ink-faint">Not observed since</span>
                            ) : (
                              <span>
                                {a.effect.before ? levelLabel(a.effect.before) : ""} → {a.effect.after ? levelLabel(a.effect.after) : ""}{" "}
                                <span className={a.effect.change > 0 ? "font-semibold text-navy" : "text-ink-soft"}>
                                  {a.effect.change > 0 ? `improved ${a.effect.change}` : a.effect.change < 0 ? `down ${-a.effect.change}` : "no change"}
                                </span>
                              </span>
                            )
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
