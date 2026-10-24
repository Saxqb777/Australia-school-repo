import Link from "next/link";
import { RATING_LEVELS } from "@/db/seed-data/rubric";
import { levelLabel, levelShort, type Level } from "@/lib/judgement";
import type { ObservationFact, RubricArea } from "@/lib/queries";
import { LEVEL_FILL } from "./levels";

export function LevelLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs" aria-label="Colour key">
      {RATING_LEVELS.map((l) => {
        const f = LEVEL_FILL[l.level];
        return (
          <li key={l.level} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="grid h-5 w-7 place-items-center font-cond text-[0.7rem] font-semibold"
              style={{ background: f.bg, color: f.fg, boxShadow: "inset 0 0 0 1px rgba(18,26,34,0.12)" }}
            >
              {l.short}
            </span>
            {l.label}
          </li>
        );
      })}
    </ul>
  );
}

function Cell({ level, label }: { level: Level | null; label: string }) {
  if (!level) {
    return (
      <td className="border border-sheet p-0">
        <span className="grid h-8 min-w-9 place-items-center text-xs text-ink-faint" aria-label={`${label}: not rated`}>
          ·
        </span>
      </td>
    );
  }
  const f = LEVEL_FILL[level];
  return (
    <td className="border-2 border-sheet p-0">
      <span
        tabIndex={0}
        className="group relative grid h-8 min-w-9 place-items-center font-cond text-[0.75rem] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-navy"
        style={{ background: f.bg, color: f.fg }}
        aria-label={`${label}: ${levelLabel(level)}`}
      >
        {levelShort(level)}
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-56 -translate-x-1/2 border border-rule bg-sheet px-2 py-1.5 text-left font-sans text-xs font-normal text-ink shadow-[0_6px_16px_rgba(6,38,61,0.18)] group-hover:block group-focus:block"
        >
          {label}
          <span className="mt-0.5 block font-semibold">{levelLabel(level)}</span>
        </span>
      </span>
    </td>
  );
}

/** Every teacher (latest observation in the filter) against every criterion. */
export function Heatmap({ rubric, latest }: { rubric: RubricArea[]; latest: ObservationFact[] }) {
  return (
    <div className="overflow-x-auto border border-rule bg-sheet">
      <table className="border-collapse text-sm">
        <caption className="sr-only">Ratings of each teacher against each criterion, from their latest observation</caption>
        <thead>
          <tr>
            <th scope="col" rowSpan={2} className="sticky left-0 z-10 min-w-40 bg-sheet px-3 py-2 text-left align-bottom font-cond">
              Teacher
            </th>
            {rubric.map((a) => (
              <th key={a.id} scope="colgroup" colSpan={a.criteria.length} className="border-x-2 border-sheet bg-navy px-1 py-1 text-center font-cond text-[0.68rem] font-semibold uppercase tracking-wide text-white">
                <abbr title={a.name} className="no-underline">
                  {a.position}
                </abbr>
              </th>
            ))}
            <th scope="col" rowSpan={2} className="bg-navy px-2 py-1 align-bottom font-cond text-[0.68rem] font-semibold uppercase text-white">
              Overall
            </th>
          </tr>
          <tr>
            {rubric.flatMap((a) =>
              a.criteria.map((c) => (
                <th key={c.id} scope="col" className="px-0.5 py-1 font-mono text-[0.65rem] font-normal text-ink-soft">
                  <abbr title={c.name} className="no-underline">
                    {c.code}
                  </abbr>
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {latest.map((f) => (
            <tr key={f.teacherId}>
              <th scope="row" className="sticky left-0 z-10 bg-sheet px-3 py-1 text-left font-normal whitespace-nowrap">
                <Link href={`/teachers/${f.teacherId}`} className="hover:underline">
                  {f.teacherName}
                </Link>
                <span className="block text-[0.7rem] text-ink-faint">
                  {f.subject} · {f.className}
                </span>
              </th>
              {rubric.flatMap((a) =>
                a.criteria.map((c) => <Cell key={c.id} level={f.ratings.get(c.id) ?? null} label={`${f.teacherName} · ${c.code} ${c.name}`} />),
              )}
              <Cell level={f.overall} label={`${f.teacherName} · Overall Lesson Judgement`} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A mean level marked on the form's six-point scale (left = Outstanding). */
export function ScaleStrip({ mean, label }: { mean: number | null; label: string }) {
  if (mean === null) return <span className="text-xs text-ink-faint">No ratings</span>;
  const pct = ((mean - 1) / 5) * 100;
  return (
    <span className="flex items-center gap-3" aria-label={`${label}: mean ${mean.toFixed(2)}, ${levelLabel(Math.min(6, Math.max(1, Math.floor(mean + 0.5))) as Level)}`}>
      <span aria-hidden className="relative h-3 flex-1 bg-[linear-gradient(to_right,#0A3655,#2C5A84,#4F78A0,#A9C1D7,#D5E1EC,#EEF2F6)]">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="absolute inset-y-0 w-0.5 bg-sheet" style={{ left: `${i * 20}%` }} />
        ))}
        <span className="absolute -top-1 h-5 w-1.5 -translate-x-1/2 border border-sheet bg-ink" style={{ left: `${pct}%` }} />
      </span>
      <span className="w-28 shrink-0 text-right text-xs">
        <span className="font-medium">{levelLabel(Math.min(6, Math.max(1, Math.floor(mean + 0.5))) as Level)}</span>{" "}
        <span className="font-mono text-ink-faint">{mean.toFixed(2)}</span>
      </span>
    </span>
  );
}
