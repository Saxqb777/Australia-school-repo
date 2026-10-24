"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HEADER_LABELS,
  IMPROVEMENTS_HEADING,
  JUDGEMENT_TABLE,
  PERCENTAGE_KEY,
  PERCENTAGE_KEY_INTRO,
  RATING_LEVELS,
  STRENGTHS_HEADING,
} from "@/db/seed-data/rubric";
import { fullDate } from "@/lib/dates";
import { completenessIssues, type CompletenessIssue } from "@/lib/completeness";
import { computeJudgement, isLevel, levelLabel, type Level } from "@/lib/judgement";
import { isPercentageCriterion } from "@/lib/percentage";
import type { ObservationState, PreviousObservation, RubricArea, VisitSummary } from "@/lib/queries";
import type { HeaderField, HeaderValues, SaveOp } from "@/lib/save-ops";
import { PercentageHelper } from "./PercentageHelper";
import { RatingStrip } from "./RatingStrip";
import { SaveIndicator } from "./SaveIndicator";
import { readPendingOps, useSaveQueue } from "./useSaveQueue";

interface Props {
  visit: VisitSummary;
  visitDateLabel: string;
  rubric: RubricArea[];
  initial: ObservationState;
  readOnly: boolean;
  previous: PreviousObservation | null;
  backHref: string;
}

type Ratings = ObservationState["ratings"];
type AreaOverrides = ObservationState["areaOverrides"];

function applyOps(
  ops: SaveOp[],
  base: { header: HeaderValues; ratings: Ratings; areaOverrides: AreaOverrides; overall: ObservationState["overall"] },
) {
  const header = { ...base.header };
  const ratings: Ratings = { ...base.ratings };
  const areaOverrides: AreaOverrides = { ...base.areaOverrides };
  let overall = base.overall;
  for (const op of ops) {
    if (op.kind === "header") header[op.field] = op.value;
    else if (op.kind === "rating") {
      ratings[op.criterionId] = { level: isLevel(op.level) ? op.level : null, comment: ratings[op.criterionId]?.comment ?? "" };
    } else if (op.kind === "comment") {
      ratings[op.criterionId] = { level: ratings[op.criterionId]?.level ?? null, comment: op.comment };
    } else if (op.kind === "area") {
      areaOverrides[op.areaId] = { level: isLevel(op.level) ? op.level : null, reason: op.reason };
    } else overall = { level: isLevel(op.level) ? op.level : null, reason: op.reason };
  }
  return { header, ratings, areaOverrides, overall };
}

function AreaMarker({ rated, total }: { rated: number; total: number }) {
  const state = rated === 0 ? "empty" : rated === total ? "full" : "part";
  return (
    <span
      aria-hidden
      className={`relative block size-2.5 border ${state === "empty" ? "border-current opacity-60" : "border-current"} ${
        state === "full" ? "bg-current" : ""
      }`}
    >
      {state === "part" ? <span className="absolute inset-y-0 left-0 w-1/2 bg-current" /> : null}
    </span>
  );
}

export function ObservationForm({ visit, visitDateLabel, rubric, initial, readOnly, previous, backHref }: Props) {
  const [header, setHeader] = useState<HeaderValues>(initial.header);
  const [ratings, setRatings] = useState<Ratings>(initial.ratings);
  const [areaOverrides, setAreaOverrides] = useState<AreaOverrides>(initial.areaOverrides);
  const [overall, setOverall] = useState(initial.overall);
  const [status, setStatus] = useState(initial.status);
  const [completedAt, setCompletedAt] = useState(initial.completedAt);
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});
  const [editingJudgement, setEditingJudgement] = useState<number | "overall" | null>(null);
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const locked = readOnly || status === "complete";
  const queue = useSaveQueue(visit.id, !readOnly);

  // Overlay changes kept on this device that the server has not confirmed yet (for example after a refresh offline).
  useEffect(() => {
    if (readOnly) return;
    const pending = Object.values(readPendingOps(visit.id)).sort((a, b) => a.ts - b.ts);
    if (pending.length === 0) return;
    const next = applyOps(pending, {
      header: initial.header,
      ratings: initial.ratings,
      areaOverrides: initial.areaOverrides,
      overall: initial.overall,
    });
    setHeader(next.header);
    setRatings(next.ratings);
    setAreaOverrides(next.areaOverrides);
    setOverall(next.overall);
  }, [readOnly, visit.id, initial]);

  const criteria = useMemo(() => rubric.flatMap((a) => a.criteria), [rubric]);

  const judgement = useMemo(() => {
    const map = new Map<number, Level>();
    for (const [id, r] of Object.entries(ratings)) if (r.level) map.set(Number(id), r.level);
    return computeJudgement(
      rubric.map((a) => {
        const o = areaOverrides[a.id];
        return { areaId: a.id, criterionIds: a.criteria.map((c) => c.id), override: o?.level ? { level: o.level, reason: o.reason } : null };
      }),
      map,
      overall.level ? { level: overall.level, reason: overall.reason } : null,
    );
  }, [rubric, ratings, areaOverrides, overall]);

  const issues: CompletenessIssue[] = useMemo(
    () =>
      completenessIssues({
        header,
        criteria,
        ratedCriterionIds: new Set(
          Object.entries(ratings)
            .filter(([, r]) => r.level !== null)
            .map(([id]) => Number(id)),
        ),
        areaOverrides: rubric.map((a) => ({
          areaName: a.name,
          level: areaOverrides[a.id]?.level ?? null,
          reason: areaOverrides[a.id]?.reason ?? "",
        })),
        overallOverride: overall,
      }),
    [header, criteria, ratings, rubric, areaOverrides, overall],
  );

  const ratedTotal = Object.values(ratings).filter((r) => r.level !== null).length;

  const setHeaderField = useCallback(
    (field: HeaderField, value: string) => {
      setHeader((h) => ({ ...h, [field]: value }));
      queue.enqueue({ kind: "header", field, value, ts: Date.now() }, 600);
    },
    [queue],
  );

  const setRating = useCallback(
    (criterionId: number, level: Level | null) => {
      setRatings((r) => ({ ...r, [criterionId]: { level, comment: r[criterionId]?.comment ?? "" } }));
      queue.enqueue({ kind: "rating", criterionId, level, ts: Date.now() }, 150);
    },
    [queue],
  );

  const setComment = useCallback(
    (criterionId: number, comment: string) => {
      setRatings((r) => ({ ...r, [criterionId]: { level: r[criterionId]?.level ?? null, comment } }));
      queue.enqueue({ kind: "comment", criterionId, comment, ts: Date.now() }, 700);
    },
    [queue],
  );

  const setAreaOverride = useCallback(
    (areaId: number, level: Level | null, reason: string) => {
      setAreaOverrides((o) => ({ ...o, [areaId]: { level, reason } }));
      queue.enqueue({ kind: "area", areaId, level, reason, ts: Date.now() }, 700);
    },
    [queue],
  );

  const setOverallOverride = useCallback(
    (level: Level | null, reason: string) => {
      setOverall({ level, reason });
      queue.enqueue({ kind: "overall", level, reason, ts: Date.now() }, 700);
    },
    [queue],
  );

  async function changeStatus(action: "complete" | "reopen") {
    setBusy(true);
    setCompleteMessage(null);
    try {
      if (action === "complete") {
        const sent = await queue.flushNow();
        if (!sent) {
          setCompleteMessage("Some changes are still on this device. Connect to the internet, then mark it complete.");
          return;
        }
      }
      const res = await fetch(`/api/visits/${visit.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => null)) as { ok: boolean; message?: string; completedAt?: string } | null;
      if (!res.ok || !body?.ok) {
        setCompleteMessage(body?.message ?? "That didn't go through. Check your connection and try again.");
        return;
      }
      if (action === "complete") {
        setStatus("complete");
        setCompletedAt(body.completedAt ?? new Date().toISOString());
      } else {
        setStatus("draft");
        setCompletedAt(null);
        queue.resume();
      }
    } catch {
      setCompleteMessage("You appear to be offline. Connect to the internet, then try again.");
    } finally {
      setBusy(false);
    }
  }

  const headerInput = (field: HeaderField, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={`field-${field}`}
      className="field"
      value={header[field]}
      disabled={locked}
      onChange={(e) => setHeaderField(field, e.target.value)}
      {...props}
    />
  );

  const prevLevels = previous
    ? new Map(previous.judgement.areas.map((a) => [a.areaId, a.effective]))
    : null;

  return (
    <div className="pb-28">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-rule bg-sheet/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
          <Link href={backHref} className="flex shrink-0 items-center gap-1 text-sm font-medium text-navy">
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            Visits
          </Link>
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="font-medium">{visit.teacherName}</span>
            <span className="text-ink-soft"> · {visit.className}</span>
          </span>
          <SaveIndicator state={queue.state} readOnly={readOnly} />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4">
        {/* Title */}
        <header className="pb-5 pt-6">
          <p className="label-caps">Teacher Observation Form · {visit.cycleLabel}</p>
          <h1 className="mt-1 font-cond text-3xl font-semibold leading-tight text-navy">{visit.teacherName}</h1>
          <p className="mt-1 text-ink-soft">
            {visit.className} · {visit.subject} · {visitDateLabel} · Period {visit.period}
          </p>
          {queue.state.message ? (
            <p role="alert" className="mt-3 border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
              {queue.state.message}
            </p>
          ) : null}
          {readOnly ? (
            <p className="mt-3 border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
              You are viewing this observation. Only {visit.observerName} can change it.
            </p>
          ) : null}
        </header>

        {/* Previous observation */}
        <details className="group border border-rule bg-sheet">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="label-caps block">Previous observation</span>
              <span className="text-sm">
                {previous
                  ? `${previous.observerName} · ${previous.className} ${previous.subject} · ${fullDate(previous.date)}`
                  : `None recorded for ${visit.teacherName}`}
              </span>
            </span>
            <span aria-hidden className="font-mono text-sm text-navy group-open:rotate-45">+</span>
          </summary>
          <div className="border-t border-rule px-4 py-3 text-sm">
            {previous ? (
              <>
                <table className="w-full">
                  <tbody>
                    {rubric.map((a) => {
                      const lvl = prevLevels?.get(a.id) ?? null;
                      return (
                        <tr key={a.id} className="border-b border-rule last:border-0">
                          <td className="py-1.5 pr-3">{a.judgementLabel}</td>
                          <td className="py-1.5 text-right font-medium">{lvl ? levelLabel(lvl) : "Not rated"}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td className="pt-2 font-semibold">{JUDGEMENT_TABLE.overallLabel}</td>
                      <td className="pt-2 text-right font-semibold">
                        {previous.judgement.overallEffective ? levelLabel(previous.judgement.overallEffective) : "Not rated"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {!previous.ownObservation ? (
                  <p className="mt-2 text-xs text-ink-soft">Comments are visible only to the observer who wrote them.</p>
                ) : null}
              </>
            ) : (
              <p className="text-ink-soft">
                This is the first observation of {visit.teacherName} in the hub. After their next visit, the ratings from
                this one will appear here so you can see what has changed.
              </p>
            )}
          </div>
        </details>

        {/* Lesson details: the form's header boxes */}
        <section aria-labelledby="lesson-details" className="mt-6" data-tour="lesson-details">
          <h2 id="lesson-details" className="bg-navy px-3 py-2 font-cond text-sm font-semibold uppercase tracking-wider text-white">
            Lesson details
          </h2>
          <div className="grid grid-cols-2 border-x border-b border-rule bg-sheet sm:grid-cols-3">
            <div className="col-span-2 border-b border-rule p-3 sm:col-span-1 sm:border-r">
              <span className="label-caps block">{HEADER_LABELS.teacher}</span>
              <span className="mt-1.5 block font-medium">{visit.teacherName}</span>
            </div>
            <div className="border-b border-r border-rule p-3">
              <label htmlFor="field-time" className="label-caps block">{HEADER_LABELS.time}</label>
              <div className="mt-1">{headerInput("time", { type: "time" })}</div>
            </div>
            <div className="border-b border-rule p-3">
              <span className="label-caps block">{HEADER_LABELS.observer}</span>
              <span className="mt-1.5 block font-medium">{visit.observerName}</span>
            </div>
            <div className="border-b border-r border-rule p-3">
              <label htmlFor="field-observedDate" className="label-caps block">{HEADER_LABELS.date}</label>
              <div className="mt-1">{headerInput("observedDate", { type: "date" })}</div>
            </div>
            <div className="border-b border-rule p-3 sm:border-r">
              <label htmlFor="field-lengthOfObservation" className="label-caps block">{HEADER_LABELS.length}</label>
              <div className="mt-1">{headerInput("lengthOfObservation", { placeholder: "e.g. 40 minutes" })}</div>
            </div>
            <div className="col-span-2 border-b border-rule p-3 sm:col-span-1">
              <label htmlFor="field-title" className="label-caps block">{HEADER_LABELS.title}</label>
              <div className="mt-1">{headerInput("title")}</div>
            </div>
            <div className="col-span-2 border-rule p-3 max-sm:border-b sm:col-span-1 sm:border-r">
              <label htmlFor="field-subject" className="label-caps block">{HEADER_LABELS.subject}</label>
              <div className="mt-1">{headerInput("subject")}</div>
            </div>
            <div className="col-span-2 border-rule p-3 max-sm:border-b sm:col-span-1 sm:border-r">
              <label htmlFor="field-topic" className="label-caps block">{HEADER_LABELS.topic}</label>
              <div className="mt-1">{headerInput("topic")}</div>
            </div>
            <div className="col-span-2 p-3 sm:col-span-1">
              <span className="label-caps block" id="roll-label">{HEADER_LABELS.roll}</span>
              <div className="mt-1 grid grid-cols-2 gap-2" role="group" aria-labelledby="roll-label">
                <div>
                  <label htmlFor="field-numberOnRoll" className="sr-only">Number on roll</label>
                  {headerInput("numberOnRoll", { inputMode: "numeric", pattern: "[0-9]*", placeholder: "Roll", className: "field font-mono" })}
                </div>
                <div>
                  <label htmlFor="field-numberPresent" className="sr-only">Number present</label>
                  {headerInput("numberPresent", { inputMode: "numeric", pattern: "[0-9]*", placeholder: "Present", className: "field font-mono" })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rubric areas */}
        {rubric.map((area, areaIndex) => {
          const aj = judgement.areas[areaIndex];
          return (
            <section key={area.id} id={`area-${area.id}`} aria-labelledby={`area-h-${area.id}`} className="mt-8 scroll-mt-16">
              <h2
                id={`area-h-${area.id}`}
                className="flex items-baseline gap-3 bg-navy px-3 py-2 font-cond font-semibold uppercase tracking-wider text-white"
              >
                <span className="font-mono text-sm opacity-70">{area.position}</span>
                <span className="flex-1 text-sm">{area.name}</span>
                <span className="text-right text-xs font-medium normal-case tracking-normal opacity-90">
                  {aj?.effective ? levelLabel(aj.effective) : `${aj?.rated ?? 0}/${aj?.total ?? 0} rated`}
                </span>
              </h2>
              <ol className="border-x border-b border-rule bg-sheet">
                {area.criteria.map((c, ci) => {
                  const r = ratings[c.id];
                  const level = r?.level ?? null;
                  const comment = r?.comment ?? "";
                  const commentOpen = openComments[c.id] || comment !== "";
                  const first = areaIndex === 0 && ci === 0;
                  return (
                    <li
                      key={c.id}
                      id={`criterion-${c.id}`}
                      className="scroll-mt-16 border-b border-rule px-3 py-4 last:border-b-0 sm:px-4"
                      data-tour={first ? "first-criterion" : undefined}
                    >
                      <p className="flex gap-2.5">
                        <span className="font-mono text-sm text-ink-faint">{c.code}</span>
                        <span className="font-medium leading-snug">{c.name}</span>
                      </p>
                      <div className="mt-3">
                        <RatingStrip
                          name={`rating-${c.id}`}
                          legend={`${c.code} ${c.name}`}
                          value={level}
                          disabled={locked}
                          onChange={(l) => setRating(c.id, l)}
                        />
                      </div>
                      <div className="mt-2 min-h-6" aria-live="polite">
                        {level ? (
                          <blockquote className="border-l-2 border-navy pl-3">
                            <span className="label-caps !text-navy">{levelLabel(level)}</span>
                            <p className="mt-0.5 leading-relaxed">{c.descriptors[level]}</p>
                          </blockquote>
                        ) : (
                          <p className="text-sm text-ink-faint">Tap a level to see the form&rsquo;s descriptor for it.</p>
                        )}
                      </div>
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-ink-soft underline decoration-rule-strong underline-offset-2">
                          Compare all six descriptors
                        </summary>
                        <dl className="mt-2 divide-y divide-rule border border-rule">
                          {RATING_LEVELS.map((l) => (
                            <div key={l.level} className={`grid gap-1 px-3 py-2 sm:grid-cols-[7rem_1fr] ${level === l.level ? "bg-navy-wash" : ""}`}>
                              <dt className="font-cond font-semibold">{l.label}</dt>
                              <dd className="leading-relaxed">{c.descriptors[l.level]}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                      {isPercentageCriterion(c.code) ? (
                        <PercentageHelper
                          code={c.code}
                          defaultPresent={header.numberPresent}
                          disabled={locked}
                          onUse={(l) => setRating(c.id, l)}
                        />
                      ) : null}
                      <div className="mt-3">
                        {commentOpen ? (
                          <>
                            <label htmlFor={`comment-${c.id}`} className="label-caps block">
                              Comments
                            </label>
                            <textarea
                              id={`comment-${c.id}`}
                              className="field mt-1 min-h-20 resize-y"
                              value={comment}
                              disabled={locked}
                              onChange={(e) => setComment(c.id, e.target.value)}
                            />
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={locked}
                            className="text-sm font-medium text-navy disabled:text-ink-faint"
                            onClick={() => setOpenComments((o) => ({ ...o, [c.id]: true }))}
                          >
                            + Add comment
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}

        {/* Overall lesson judgement */}
        <section id="judgement" aria-labelledby="judgement-h" className="mt-10 scroll-mt-16" data-tour="judgement">
          <h2 id="judgement-h" className="font-cond text-xl font-semibold text-navy">
            {JUDGEMENT_TABLE.title}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Each area is the average of its criteria; the overall judgement is the average of the areas. An exact half
            rounds to the weaker level.
          </p>
          <table className="mt-3 w-full border border-rule bg-sheet text-sm">
            <thead>
              <tr className="bg-navy text-left text-white">
                <th scope="col" className="px-3 py-2 font-cond font-semibold">{JUDGEMENT_TABLE.elementsHeading}</th>
                <th scope="col" className="px-3 py-2 text-right font-cond font-semibold">{JUDGEMENT_TABLE.ratingHeading}</th>
              </tr>
            </thead>
            <tbody>
              {rubric.map((area, i) => {
                const aj = judgement.areas[i];
                const o = areaOverrides[area.id];
                const editing = editingJudgement === area.id;
                return (
                  <JudgementRow
                    key={area.id}
                    label={area.judgementLabel}
                    computed={aj?.computed ?? null}
                    mean={aj?.mean ?? null}
                    overrideLevel={o?.level ?? null}
                    reason={o?.reason ?? ""}
                    editing={editing}
                    locked={locked}
                    onEdit={() => setEditingJudgement(editing ? null : area.id)}
                    onChange={(l, reason) => setAreaOverride(area.id, l, reason)}
                  />
                );
              })}
              <JudgementRow
                label={JUDGEMENT_TABLE.overallLabel}
                strong
                computed={judgement.overallComputed}
                mean={judgement.overallMean}
                overrideLevel={overall.level}
                reason={overall.reason}
                editing={editingJudgement === "overall"}
                locked={locked}
                onEdit={() => setEditingJudgement(editingJudgement === "overall" ? null : "overall")}
                onChange={(l, reason) => setOverallOverride(l, reason)}
              />
            </tbody>
          </table>

          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-ink-soft underline decoration-rule-strong underline-offset-2">
              Percentage key used in the descriptors
            </summary>
            <p className="mt-2 text-ink-soft">{PERCENTAGE_KEY_INTRO}</p>
            <div className="mt-2 grid grid-cols-2 border-l border-t border-rule sm:grid-cols-4">
              {PERCENTAGE_KEY.map((k) => (
                <div key={k.term} className="border-b border-r border-rule bg-sheet px-3 py-2">
                  <span className="block font-medium">{k.term}</span>
                  <span className="font-mono text-xs text-ink-soft">{k.range}</span>
                </div>
              ))}
            </div>
          </details>
        </section>

        {/* Phase 2 sections, shown as the form shows them */}
        <section className="mt-8 grid border border-rule bg-sheet sm:grid-cols-2" aria-label="Strengths and improvements">
          <div className="border-rule p-3 max-sm:border-b sm:border-r">
            <h2 className="label-caps">{STRENGTHS_HEADING}</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Written from your ratings and comments once AI feedback is switched on in the next phase. You will be able
              to edit every line before anything is sent.
            </p>
          </div>
          <div className="p-3">
            <h2 className="label-caps">{IMPROVEMENTS_HEADING}</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Suggested from the criteria rated lowest, in the same way, and always editable.
            </p>
          </div>
        </section>

        {/* Complete */}
        <section className="mt-8 border-t-2 border-navy pt-5" data-tour="complete" aria-labelledby="complete-h">
          <h2 id="complete-h" className="font-cond text-xl font-semibold text-navy">
            {status === "complete" ? "Observation complete" : "Finish the observation"}
          </h2>
          {status === "complete" ? (
            <div className="mt-2">
              <p className="text-ink-soft">
                Marked complete
                {completedAt
                  ? ` on ${new Date(completedAt).toLocaleString("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`
                  : ""}
                . The ratings are locked.
              </p>
              {!readOnly ? (
                <button type="button" className="btn btn-quiet mt-3" disabled={busy} onClick={() => void changeStatus("reopen")}>
                  Reopen to make changes
                </button>
              ) : null}
            </div>
          ) : readOnly ? (
            <p className="mt-2 text-ink-soft">This observation is still in progress.</p>
          ) : (
            <div className="mt-2">
              {issues.length > 0 ? (
                <>
                  <p className="text-ink-soft">
                    <span className="font-mono text-ink">{ratedTotal}</span> of <span className="font-mono text-ink">{criteria.length}</span>{" "}
                    criteria rated. Still to fill in:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {issues.map((i) => (
                      <li key={`${i.kind}-${i.label}`}>
                        <a href={`#${i.anchor}`} className="link">
                          {i.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-ink-soft">Every box is filled in and all 20 criteria are rated.</p>
              )}
              {completeMessage ? (
                <p role="alert" className="mt-3 border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
                  {completeMessage}
                </p>
              ) : null}
              <button
                type="button"
                className="btn btn-primary mt-4 w-full sm:w-auto"
                disabled={issues.length > 0 || busy}
                onClick={() => void changeStatus("complete")}
              >
                {busy ? "Marking complete…" : "Mark complete"}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Area navigator, within thumb reach */}
      <nav
        aria-label="Jump to area"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-sheet/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        data-tour="area-nav"
      >
        <div className="mx-auto flex max-w-3xl items-stretch gap-1 px-2 py-1.5">
          {rubric.map((area, i) => {
            const aj = judgement.areas[i];
            return (
              <a
                key={area.id}
                href={`#area-${area.id}`}
                className="flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-navy hover:bg-navy-wash"
                aria-label={`${area.position}. ${area.name}: ${aj?.rated ?? 0} of ${aj?.total ?? 0} rated`}
              >
                <span className="font-mono text-sm leading-none">{area.position}</span>
                <AreaMarker rated={aj?.rated ?? 0} total={aj?.total ?? 0} />
              </a>
            );
          })}
          <a
            href="#judgement"
            className="flex min-h-11 flex-[1.4] flex-col items-center justify-center bg-navy px-1 text-white"
            aria-label="Overall lesson judgement"
          >
            <span className="font-cond text-[0.7rem] font-semibold uppercase leading-tight tracking-wide">Overall</span>
            <span className="text-[0.7rem] leading-tight">
              {judgement.overallEffective ? levelLabel(judgement.overallEffective) : `${ratedTotal}/20`}
            </span>
          </a>
        </div>
      </nav>
    </div>
  );
}

interface JudgementRowProps {
  label: string;
  strong?: boolean;
  computed: Level | null;
  mean: number | null;
  overrideLevel: Level | null;
  reason: string;
  editing: boolean;
  locked: boolean;
  onEdit: () => void;
  onChange: (level: Level | null, reason: string) => void;
}

function JudgementRow({ label, strong, computed, mean, overrideLevel, reason, editing, locked, onEdit, onChange }: JudgementRowProps) {
  const effective = overrideLevel ?? computed;
  const selectId = `override-${label.replace(/\W+/g, "-")}`;
  return (
    <>
      <tr className={`border-t border-rule ${strong ? "bg-navy-wash" : ""}`}>
        <th scope="row" className={`px-3 py-2.5 text-left align-top ${strong ? "font-semibold" : "font-normal"}`}>
          {label}
          {overrideLevel ? (
            <span className="mt-0.5 block text-xs text-ink-soft">
              Changed from {computed ? levelLabel(computed) : "not rated"}
            </span>
          ) : null}
        </th>
        <td className="px-3 py-2.5 text-right align-top">
          <span className={strong ? "font-semibold" : "font-medium"}>{effective ? levelLabel(effective) : "—"}</span>
          {mean !== null ? <span className="block font-mono text-xs text-ink-faint">mean {mean.toFixed(2)}</span> : null}
          {!locked && computed ? (
            <button type="button" className="mt-1 text-xs font-medium text-navy underline underline-offset-2" onClick={onEdit} aria-expanded={editing}>
              {editing ? "Done" : "Change"}
            </button>
          ) : null}
        </td>
      </tr>
      {editing && !locked ? (
        <tr className="border-t border-dashed border-rule">
          <td colSpan={2} className="px-3 pb-3 pt-2">
            <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
              <div>
                <label htmlFor={selectId} className="label-caps block">Rating</label>
                <select
                  id={selectId}
                  className="field mt-1"
                  value={overrideLevel ?? ""}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    onChange(isLevel(v) ? v : null, isLevel(v) ? reason : "");
                  }}
                >
                  <option value="">Use the average{computed ? ` (${levelLabel(computed)})` : ""}</option>
                  {RATING_LEVELS.map((l) => (
                    <option key={l.level} value={l.level}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              {overrideLevel ? (
                <div>
                  <label htmlFor={`${selectId}-reason`} className="label-caps block">Reason for the change (required)</label>
                  <textarea
                    id={`${selectId}-reason`}
                    className="field mt-1 min-h-16"
                    value={reason}
                    onChange={(e) => onChange(overrideLevel, e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
