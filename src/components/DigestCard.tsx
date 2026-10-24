import type { DigestPayload } from "@/db/schema";
import { dayMonth } from "@/lib/dates";

export function DigestCard({ payload, generatedAt }: { payload: DigestPayload; generatedAt: Date }) {
  return (
    <div className="border border-rule border-t-4 border-t-navy bg-sheet">
      <div className="flex flex-wrap items-baseline gap-x-3 border-b border-rule px-4 py-3">
        <h2 className="font-cond text-lg font-semibold">Friday summary</h2>
        <span className="text-sm text-ink-soft">
          Week of {dayMonth(payload.weekStart)} to {dayMonth(payload.weekEnd)}
        </span>
        <span className="ml-auto text-xs text-ink-faint">
          Made {generatedAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })}
        </span>
      </div>
      <div className="grid gap-4 px-4 py-3 text-sm sm:grid-cols-4">
        <div>
          <p className="label-caps">Visits done</p>
          <p className="font-cond text-2xl font-semibold">{payload.visitsDone}</p>
        </div>
        <div>
          <p className="label-caps">Outstanding</p>
          <p className="font-cond text-2xl font-semibold">{payload.visitsOutstanding}</p>
          {payload.outstandingList.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-xs text-ink-soft">
              {payload.outstandingList.slice(0, 6).map((o, i) => (
                <li key={i}>
                  {o.teacher} ({o.observer}, {dayMonth(o.date)})
                </li>
              ))}
              {payload.outstandingList.length > 6 ? <li>and {payload.outstandingList.length - 6} more</li> : null}
            </ul>
          ) : null}
        </div>
        <div>
          <p className="label-caps">Top strengths</p>
          {payload.topStrengths.length === 0 ? (
            <p className="text-ink-faint">No completed observations this week.</p>
          ) : (
            <ol className="mt-1 space-y-1">
              {payload.topStrengths.map((c) => (
                <li key={c.code}>
                  <span className="font-mono text-xs text-ink-soft">{c.code}</span> {c.name}
                </li>
              ))}
            </ol>
          )}
        </div>
        <div>
          <p className="label-caps">Top concerns</p>
          {payload.topConcerns.length === 0 ? (
            <p className="text-ink-faint">No completed observations this week.</p>
          ) : (
            <ol className="mt-1 space-y-1">
              {payload.topConcerns.map((c) => (
                <li key={c.code}>
                  <span className="font-mono text-xs text-ink-soft">{c.code}</span> {c.name}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
