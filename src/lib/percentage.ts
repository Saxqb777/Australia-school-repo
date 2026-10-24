import { PERCENTAGE_KEY } from "@/db/seed-data/rubric";
import type { Level } from "./judgement";

export type PercentageTerm = (typeof PERCENTAGE_KEY)[number];

/** Whole-number percentage, rounded half up, so it can be read against the form's key. */
export function wholePercent(count: number, of: number): number | null {
  if (!Number.isFinite(count) || !Number.isFinite(of) || of <= 0 || count < 0 || count > of) return null;
  return Math.floor((count / of) * 100 + 0.5);
}

export function termForPercent(percent: number): PercentageTerm | null {
  return PERCENTAGE_KEY.find((t) => percent >= t.min && percent <= t.max) ?? null;
}

/** The two criteria whose descriptors are written in the percentage key's terms. */
export const PERCENTAGE_CRITERIA = {
  "4.1": {
    betterLabel: "Above curriculum standards",
    atLeastLabel: "At least in line with curriculum standards",
  },
  "5.1": {
    betterLabel: "Better than expected progress",
    atLeastLabel: "At least expected progress",
  },
} as const;

export type PercentageCriterionCode = keyof typeof PERCENTAGE_CRITERIA;

export function isPercentageCriterion(code: string): code is PercentageCriterionCode {
  return code in PERCENTAGE_CRITERIA;
}

export interface PercentageSuggestion {
  level: Level;
  betterPercent: number;
  atLeastPercent: number;
  reason: string;
}

/**
 * Suggests a level for Attainment (4.1) or Progress (5.1) from student counts, reading the form's
 * descriptors against its percentage key:
 *  Outstanding: most (75%+) better/above; Very Good: a large majority (61%+); Good: the majority (50%+);
 *  Acceptable: most (75%+) at least in line / expected; Weak: fewer than that; Very Weak: only a few (15% or less).
 * It is a suggestion only; the observer always chooses the rating.
 */
export function suggestLevel(present: number, better: number, atLeast: number): PercentageSuggestion | null {
  if (better > atLeast) return null;
  const b = wholePercent(better, present);
  const a = wholePercent(atLeast, present);
  if (b === null || a === null) return null;
  const pick = (level: Level, reason: string): PercentageSuggestion => ({
    level,
    betterPercent: b,
    atLeastPercent: a,
    reason,
  });
  if (b >= 75) return pick(1, `${b}% is "most" or more`);
  if (b >= 61) return pick(2, `${b}% is a "large majority"`);
  if (b >= 50) return pick(3, `${b}% is the "majority"`);
  if (a >= 75) return pick(4, `${a}% at least meet the standard: "most"`);
  if (a > 15) return pick(5, `${a}% at least meet the standard: fewer than "most"`);
  return pick(6, `${a}% at least meet the standard: "few"`);
}
