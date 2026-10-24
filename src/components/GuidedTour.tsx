"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export interface TourStep {
  /** Matches an element with data-tour="<target>". Omit for a centred step. */
  target?: string;
  title: string;
  body: string;
}

export type TourKey = "visits" | "observe" | "admin" | "teacher" | "dashboard";

const REPLAY_EVENT = "asad:tour-replay";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function findTarget(target: string | undefined): HTMLElement | null {
  if (!target) return null;
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Floating step-by-step guide that highlights parts of the real screen. */
export function GuidedTour({ tourKey, steps, autoStart }: { tourKey: TourKey; steps: TourStep[]; autoStart: boolean }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const step = steps[index];
  const last = index === steps.length - 1;

  const record = useCallback(() => {
    void fetch("/api/tour", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tour: tourKey }),
    }).catch(() => undefined);
  }, [tourKey]);

  const close = useCallback(() => {
    setOpen(false);
    record();
  }, [record]);

  useEffect(() => {
    if (autoStart) {
      const t = window.setTimeout(() => setOpen(true), 500);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [autoStart]);

  useEffect(() => {
    const replay = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(REPLAY_EVENT, replay);
    return () => window.removeEventListener(REPLAY_EVENT, replay);
  }, []);

  const measure = useCallback(() => {
    setIsNarrow(window.innerWidth < 640);
    const el = findTarget(step?.target);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step?.target]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = findTarget(step?.target);
    if (el) el.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    measure();
    const t = window.setTimeout(measure, 350);
    headingRef.current?.focus();
    return () => window.clearTimeout(t);
  }, [open, index, step?.target, measure]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, measure, close, steps.length]);

  if (!open || !step) return null;

  const pad = 6;
  const cardWidth = 340;
  let cardStyle: React.CSSProperties;
  if (isNarrow || !rect) {
    cardStyle = isNarrow
      ? { left: 12, right: 12, bottom: 12 }
      : { left: "50%", top: "50%", width: cardWidth, transform: "translate(-50%, -50%)" };
  } else {
    const below = rect.top + rect.height + pad + 12;
    const fitsBelow = below + 230 < window.innerHeight;
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - cardWidth - 12);
    cardStyle = fitsBelow
      ? { top: below, left, width: cardWidth }
      : { top: Math.max(12, rect.top - pad - 12 - 230), left, width: cardWidth };
  }

  return (
    <div className="fixed inset-0 z-50" aria-live="polite">
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed border-2 border-navy transition-all duration-200"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(6, 38, 61, 0.42)",
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-navy-deep/40" />
      )}
      <section
        role="dialog"
        aria-labelledby={headingId}
        className="fixed border border-rule border-t-4 border-t-navy bg-sheet shadow-[0_10px_30px_rgba(6,38,61,0.25)]"
        style={cardStyle}
      >
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
          <span className="label-caps !text-navy">How it works</span>
          <ol className="flex gap-1" aria-label={`Step ${index + 1} of ${steps.length}`}>
            {steps.map((s, i) => (
              <li
                key={s.title}
                aria-hidden
                className={`grid size-4 place-items-center border ${
                  i <= index ? "border-navy bg-navy text-white" : "border-rule-strong bg-sheet"
                }`}
              >
                {i < index ? (
                  <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
                    <path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
        <div className="px-4 pb-4 pt-3">
          <p className="font-mono text-xs text-ink-faint">
            {String(index + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </p>
          <h2 ref={headingRef} id={headingId} tabIndex={-1} className="mt-1 font-cond text-lg font-semibold text-navy outline-none">
            {step.title}
          </h2>
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink">{step.body}</p>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={close} className="mr-auto text-sm text-ink-soft underline underline-offset-2">
              {last ? "Close" : "Skip tour"}
            </button>
            {index > 0 ? (
              <button type="button" className="btn btn-quiet !min-h-10" onClick={() => setIndex(index - 1)}>
                Back
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-primary !min-h-10"
              onClick={() => (last ? close() : setIndex(index + 1))}
            >
              {last ? "Start using it" : "Next"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ReplayTourButton({ label = "Show me how" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(REPLAY_EVENT))}
      className="btn btn-quiet !min-h-9 !px-3 !text-sm"
    >
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6.2 6.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="8" cy="11.6" r=".8" fill="currentColor" />
      </svg>
      {label}
    </button>
  );
}
