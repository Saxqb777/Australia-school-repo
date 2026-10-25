"use client";

import { useEffect, useState } from "react";

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Types `text` out after `delay` ms, one character every `speed` ms. Shows it all at once with reduced motion. */
export function useTypewriter(text: string, delay: number, speed: number): string {
  const [count, setCount] = useState(() => (reducedMotion() ? text.length : 0));
  useEffect(() => {
    if (reducedMotion()) {
      setCount(text.length);
      return undefined;
    }
    setCount(0);
    let timer = 0;
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        setCount((c) => {
          if (c >= text.length) {
            window.clearInterval(timer);
            return c;
          }
          return c + 1;
        });
      }, speed);
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [text, delay, speed]);
  return text.slice(0, count);
}

/** How many of the timeline's moments (ms after the scene opens) have passed. All of them with reduced motion. */
export function useStep(timeline: number[]): number {
  const [step, setStep] = useState(() => (reducedMotion() ? timeline.length : 0));
  const key = timeline.join(",");
  useEffect(() => {
    if (reducedMotion()) {
      setStep(key.split(",").length);
      return undefined;
    }
    const timers = key.split(",").map((ms, i) => window.setTimeout(() => setStep(i + 1), Number(ms)));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [key]);
  return step;
}

export function Sequence({ show, children }: { show: boolean; children: React.ReactNode }) {
  return show ? <>{children}</> : null;
}

/** The app's notification bell with its unread badge. */
export function Bell({ count }: { count: number }) {
  return (
    <span className="relative grid size-10 shrink-0 place-items-center bg-navy-wash">
      <svg viewBox="0 0 20 20" className="size-5 text-navy" aria-hidden>
        <path d="M10 3a4.5 4.5 0 0 0-4.5 4.5v3L4 13h12l-1.5-2.5v-3A4.5 4.5 0 0 0 10 3Zm-1.8 12a1.8 1.8 0 0 0 3.6 0" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <span className="wl-pop absolute right-0.5 top-0.5 min-w-4 bg-navy px-1 text-center font-mono text-[0.6rem] leading-4 text-white">{count}</span>
    </span>
  );
}
