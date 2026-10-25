import Link from "next/link";
import { OBSERVER_STEPS, STEPS_DISMISSED, TEACHER_STEPS, stepMark, type StepKey } from "@/lib/progress";
import type { CurrentUser } from "@/lib/session";
import { DismissSteps } from "./DismissSteps";

/**
 * "Your first steps": four boxes that tick themselves as the person really does each thing.
 * Hidden once they close it after finishing.
 */
export function FirstSteps({
  user,
  kind,
  hrefs,
}: {
  user: CurrentUser;
  kind: "observer" | "teacher";
  /** Where to go to do each step. */
  hrefs: Partial<Record<StepKey, string | null>>;
}) {
  if (user.toursCompleted.includes(STEPS_DISMISSED)) return null;
  const steps = kind === "observer" ? OBSERVER_STEPS : TEACHER_STEPS;
  const done = steps.map((s) => user.toursCompleted.includes(stepMark(s.key)));
  const doneCount = done.filter(Boolean).length;
  const next = done.indexOf(false);
  const finished = next === -1;
  const nextHref = finished ? null : (hrefs[steps[next]?.key ?? "rate"] ?? null);

  return (
    <section aria-labelledby="first-steps-h" className="mt-5 border border-rule border-l-4 border-l-navy bg-sheet px-4 py-3.5" data-tour="first-steps">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="first-steps-h" className="font-cond text-lg font-semibold text-navy">
          {finished ? "You know the whole cycle" : kind === "observer" ? "Your first observation" : "Your first feedback"}
        </h2>
        <span className="font-mono text-sm text-ink-soft">
          {doneCount} of {steps.length}
        </span>
        {finished ? (
          <span className="ml-auto">
            <DismissSteps />
          </span>
        ) : null}
      </div>
      <ol className="mt-2.5 grid gap-x-4 gap-y-2 sm:grid-cols-4">
        {steps.map((s, i) => {
          const isNext = i === next;
          const box = (
            <span
              aria-hidden
              className={`grid size-[1.1rem] shrink-0 place-items-center border ${done[i] ? "border-navy bg-navy text-white" : isNext ? "border-navy bg-sheet" : "border-rule-strong bg-sheet"}`}
            >
              {done[i] ? (
                <svg viewBox="0 0 12 12" className="size-2.5">
                  <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              ) : null}
            </span>
          );
          const label = (
            <>
              {box}
              <span className={done[i] ? "text-ink-soft line-through decoration-rule-strong" : isNext ? "font-semibold text-navy" : "text-ink"}>{s.label}</span>
              <span className="sr-only">{done[i] ? " (done)" : isNext ? " (next)" : ""}</span>
            </>
          );
          return (
            <li key={s.key} className="text-sm">
              {isNext && nextHref ? (
                <Link href={nextHref} className="flex items-center gap-2 underline-offset-2 hover:underline">
                  {label}
                  <svg viewBox="0 0 16 16" className="size-3.5 text-navy" aria-hidden>
                    <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </Link>
              ) : (
                <span className="flex items-center gap-2">{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
