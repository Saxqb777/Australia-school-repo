"use client";

import { useEffect, useState } from "react";
import { Sequence, useStep, useTypewriter } from "./stage-kit";

const ROWS: { who: string; cells: [boolean, boolean, boolean] }[] = [
  { who: "Administrator", cells: [true, false, true] },
  { who: "Ms. Ayan, Ms. Marwa", cells: [true, true, false] },
  { who: "Teachers", cells: [false, true, false] },
];
const COLUMNS = ["Whole school", "Their own observations", "Go live"];

/** Who sees what, ticked in like boxes on the form. */
export function AdminRolesStage() {
  return (
    <table className="w-full border border-rule bg-sheet text-sm">
      <thead>
        <tr className="border-b border-rule-strong">
          <th className="w-[38%]" />
          {COLUMNS.map((c) => (
            <th key={c} scope="col" className="label-caps px-1 py-2 text-center !text-[0.62rem] leading-tight">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((r, ri) => (
          <tr key={r.who} className="border-b border-rule last:border-b-0">
            <th scope="row" className="px-3 py-2.5 text-left font-medium">
              {r.who}
            </th>
            {r.cells.map((on, ci) => (
              <td key={COLUMNS[ci]} className="py-2.5 text-center">
                <span
                  className={`wl-pop mx-auto grid size-5 place-items-center border ${on ? "border-navy bg-navy text-white" : "border-rule-strong"}`}
                  style={{ animationDelay: `${150 + (ri * 3 + ci) * 90}ms` }}
                >
                  {on ? (
                    <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                      <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  ) : null}
                  <span className="sr-only">{on ? "Yes" : "No"}</span>
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const VIEWS = [
  { who: "Administrator", page: "Register", nav: ["Register", "Dashboard", "Team leader observations"] },
  { who: "Ms. Ayan (Observer)", page: "My visits", nav: ["My visits", "Register", "Dashboard"] },
  { who: "Ms. Walaa (Teacher)", page: "My observations", nav: ["My observations", "My workshops"] },
];

/** The demo banner's Switch role, cycling through what each person sees. */
export function AdminSwitchStage() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % VIEWS.length), 1900);
    return () => window.clearInterval(t);
  }, []);
  const v = VIEWS[i] ?? VIEWS[0]!;
  return (
    <div className="border border-rule bg-sheet">
      <div className="flex items-center gap-3 border-b border-dashed border-navy bg-navy-wash px-3 py-2 text-xs">
        <span className="font-cond font-semibold uppercase tracking-wider text-navy">Demo</span>
        <span key={v.who} className="wl-rise text-ink-soft">
          Viewing as <span className="font-medium text-ink">{v.who}</span>
        </span>
        <span className="ml-auto font-medium text-navy underline underline-offset-2">Switch role</span>
      </div>
      <div key={v.page} className="wl-rise px-3 pb-3 pt-2">
        <ul className="flex gap-3 border-b border-rule text-xs text-ink-soft">
          {v.nav.map((n, ni) => (
            <li key={n} className={`whitespace-nowrap py-1.5 ${ni === 0 ? "border-b-2 border-navy font-semibold text-navy" : ""}`}>
              {n}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-cond text-2xl font-semibold text-navy">{v.page}</p>
        <div className="mt-2 space-y-1.5" aria-hidden>
          <div className="h-2 w-4/5 bg-rule" />
          <div className="h-2 w-3/5 bg-rule" />
        </div>
      </div>
    </div>
  );
}

/** Everything downloads as Excel or CSV. */
export function AdminExportStage() {
  const files = ["Observations.xlsx", "Ratings.csv", "Dashboard.xlsx"];
  return (
    <ul className="space-y-2">
      {files.map((f, i) => (
        <li key={f} className="wl-rise flex items-center gap-3 border border-rule bg-sheet px-3 py-2.5 text-sm" style={{ animationDelay: `${120 + i * 150}ms` }}>
          <svg viewBox="0 0 16 16" className="size-4 text-navy" aria-hidden>
            <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <span className="font-mono text-[0.85rem]">{f}</span>
        </li>
      ))}
    </ul>
  );
}

/** Typing GO LIVE unlocks the button, as on the real page. */
export function AdminGoLiveStage() {
  const typed = useTypewriter("GO LIVE", 700, 150);
  const ready = typed === "GO LIVE";
  const step = useStep([2200]);
  return (
    <div className="border border-rule bg-sheet px-4 py-3">
      <p className="label-caps">Type GO LIVE to confirm</p>
      <div className="mt-1.5 flex gap-2">
        <span className="field flex min-h-11 items-center font-mono tracking-wider" aria-hidden>
          {typed}
          {!ready ? <span className="wl-caret ml-px inline-block h-[1.05em] w-[2px] bg-navy" /> : null}
        </span>
        <span className={`btn shrink-0 transition-colors ${ready ? "btn-primary" : "border-rule-strong bg-rule-strong text-white"}`}>Go live</span>
      </div>
      <Sequence show={step >= 1}>
        <ul className="wl-rise mt-3 space-y-1 text-sm">
          <li className="flex items-center gap-2">
            <Tick /> Demo data deleted
          </li>
          <li className="flex items-center gap-2">
            <Tick /> Password sign-in opens with the Week 10 schedule
          </li>
        </ul>
      </Sequence>
    </div>
  );
}

function Tick() {
  return (
    <span className="grid size-4 shrink-0 place-items-center bg-navy text-white">
      <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
        <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </span>
  );
}
