"use client";

import { useState } from "react";
import { RatingStrip } from "@/components/observe/RatingStrip";
import { StatusMark } from "@/components/StatusMark";
import { levelLabel, type Level } from "@/lib/judgement";
import { Bell, Sequence, useStep, useTypewriter } from "./stage-kit";
import type { WelcomeData } from "./types";

const SAMPLE_ROWS: NonNullable<WelcomeData["week"]>["rows"] = [
  { day: "Mon", period: 2, teacherName: "Ms. Walaa", className: "4B", subject: "English", status: "complete", ratedCount: 20 },
  { day: "Mon", period: 3, teacherName: "Ms. Rana", className: "1A", subject: "Maths", status: "in_progress", ratedCount: 8 },
  { day: "Tue", period: 5, teacherName: "Ms. Mona", className: "4A", subject: "Music", status: "not_started", ratedCount: 0 },
];

const FALLBACK_EXAMPLE = { teacherName: "Ms. Walaa", className: "4B", subject: "English" };

/** The observer's real week, three rows from the next visit to do. */
export function WeekStage({ week, loading }: { week: WelcomeData["week"]; loading: boolean }) {
  if (loading) return <Skeleton rows={3} />;
  const rows = week?.rows.length ? week.rows : SAMPLE_ROWS;
  return (
    <div>
      <p className="label-caps flex">
        <span>{week ? week.label : "Example week"}</span>
        {week ? <span className="ml-auto font-mono normal-case tracking-normal">{week.count} visits</span> : null}
      </p>
      <ul className="mt-2 border border-rule bg-sheet">
        {rows.map((r, i) => (
          <li
            key={`${r.period}-${r.teacherName}`}
            className="wl-rise grid grid-cols-[2.75rem_1fr_auto] items-center gap-x-3 border-b border-rule px-3 py-2.5 last:border-b-0"
            style={{ animationDelay: `${120 + i * 140}ms` }}
          >
            <span className="leading-none">
              <span className="label-caps block !text-[0.6rem]">{r.day}</span>
              <span className="mt-0.5 block font-mono text-lg text-ink">
                <span className="sr-only">Period </span>
                {r.period}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{r.teacherName}</span>
              <span className="block truncate text-xs text-ink-soft">
                {r.className} · {r.subject}
              </span>
            </span>
            <StatusMark status={r.status} ratedCount={r.ratedCount} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The real first criterion and the real rating strip: tap a level and the form's own words appear. */
export function RateStage({ criterion, loading }: { criterion: WelcomeData["criterion"]; loading: boolean }) {
  const [level, setLevel] = useState<Level | null>(null);
  if (loading || !criterion) return <Skeleton rows={2} />;
  return (
    <div>
      <p className="flex gap-2 text-sm">
        <span className="font-mono text-ink-faint">{criterion.code}</span>
        <span className="font-medium">{criterion.name}</span>
      </p>
      <div className={`mt-2.5 ${level ? "" : "wl-invite"}`}>
        <RatingStrip name="welcome-try" legend={`Try it: ${criterion.code} ${criterion.name}`} value={level} disabled={false} onChange={setLevel} />
      </div>
      {level ? (
        <p key={level} className="wl-rise mt-3 border-l-2 border-navy bg-sheet px-3 py-2 text-sm leading-relaxed" aria-live="polite">
          <span className="font-semibold text-navy">{levelLabel(level)}.</span> {criterion.descriptors[level]}
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-navy">
          <svg viewBox="0 0 20 20" className="wl-tap size-5" aria-hidden>
            <path d="M8 9V4.2a1.3 1.3 0 0 1 2.6 0V9l3.6.7c.8.2 1.3.9 1.2 1.7l-.6 4.1a2 2 0 0 1-2 1.7H9.2a2 2 0 0 1-1.6-.8L4.8 12.7a1.2 1.2 0 0 1 1.8-1.6L8 12.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          Try it: tap any level
        </p>
      )}
    </div>
  );
}

/** Ratings in, a letter out: the draft types itself. */
export function LetterStage({ example, observerName }: { example: WelcomeData["example"]; observerName: string }) {
  const e = example ?? FALLBACK_EXAMPLE;
  const letter =
    `Dear ${e.teacherName},\n\n` +
    `Thank you for welcoming me into your ${e.className} ${e.subject} lesson. Your questioning helped students explain ` +
    `their thinking, and clear routines kept the whole class focused. As a next step, `;
  const typed = useTypewriter(letter, 900, 16);
  return (
    <div>
      <ul className="flex flex-wrap items-center gap-1.5 text-xs">
        {["Very Good", "Good", "Outstanding"].map((l, i) => (
          <li key={l} className="wl-rise inline-flex items-center gap-1.5 border border-navy bg-sheet px-2 py-1 font-medium text-navy" style={{ animationDelay: `${100 + i * 120}ms` }}>
            <span className="grid size-3 place-items-center bg-navy text-white">
              <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
                <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
            {l}
          </li>
        ))}
        <li className="wl-rise text-ink-soft" style={{ animationDelay: "460ms" }}>
          + your comments
        </li>
      </ul>
      <div className="wl-rise relative mt-3 border border-rule bg-sheet px-4 pb-3 pt-6" style={{ animationDelay: "620ms" }}>
        <span className="absolute left-4 top-2 font-cond text-[0.65rem] font-semibold uppercase tracking-wider text-ink-faint">
          Example draft · {observerName}
        </span>
        <p className="min-h-[6.5rem] whitespace-pre-line text-[0.9rem] leading-relaxed text-ink" aria-label={letter}>
          <span aria-hidden>{typed}</span>
          <span aria-hidden className="wl-caret ml-px inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-navy" />
        </p>
      </div>
    </div>
  );
}

/** Saved even offline, then one tap shares it and the teacher's notice arrives. */
export function ShareStage({ example, observerName }: { example: WelcomeData["example"]; observerName: string }) {
  const e = example ?? FALLBACK_EXAMPLE;
  const step = useStep([700, 1500, 1900]);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors ${
            step >= 1 ? "bg-navy-wash text-navy" : "border border-dashed border-navy text-navy"
          }`}
        >
          <span className={`size-2 ${step >= 1 ? "bg-navy" : "border border-navy"}`} />
          {step >= 1 ? "Saved" : "Offline · kept on this device"}
        </span>
        <span className={`btn ml-auto !min-h-9 !px-3 !text-sm transition-transform ${step >= 2 ? "btn-quiet" : "btn-primary"} ${step === 2 ? "scale-[0.97]" : ""}`}>
          {step >= 2 ? (
            <>
              <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              Shared
            </>
          ) : (
            `Share with ${e.teacherName}`
          )}
        </span>
      </div>
      <Sequence show={step >= 3}>
        <div className="wl-drop mt-4 flex gap-3 border border-rule border-l-4 border-l-navy bg-sheet px-3 py-3 shadow-[0_8px_20px_rgba(6,38,61,0.12)]">
          <Bell count={1} />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">New lesson feedback</p>
            <p className="text-ink-soft">
              {observerName} has shared feedback on your {e.subject} lesson with {e.className}.
            </p>
            <p className="mt-1 font-cond text-[0.65rem] font-semibold uppercase tracking-wider text-ink-faint">{e.teacherName}&rsquo;s page · now</p>
          </div>
        </div>
      </Sequence>
    </div>
  );
}

export function Skeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="space-y-2">
      <div className="h-3 w-32 animate-pulse bg-rule" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 animate-pulse border border-rule bg-sheet" />
      ))}
    </div>
  );
}
