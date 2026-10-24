"use client";

import { RATING_LEVELS } from "@/db/seed-data/rubric";
import type { Level } from "@/lib/judgement";

interface RatingStripProps {
  name: string;
  legend: string;
  value: Level | null;
  disabled: boolean;
  onChange: (level: Level | null) => void;
}

/**
 * The form's six rating columns as a single-select row. Native radios keep keyboard arrows and screen
 * readers working; tapping the chosen level again clears it.
 */
export function RatingStrip({ name, legend, value, disabled, onChange }: RatingStripProps) {
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="sr-only">{legend}</legend>
      <div className="grid grid-cols-6 border border-rule-strong bg-sheet">
        {RATING_LEVELS.map(({ level, label, short }) => {
          const checked = value === level;
          return (
            <label
              key={level}
              className={`relative flex min-h-12 cursor-pointer select-none flex-col items-center justify-center border-r border-rule px-0.5 py-1.5 text-center last:border-r-0 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-navy ${
                checked ? "bg-navy text-white" : "hover:bg-navy-wash"
              } ${disabled ? "cursor-default opacity-80" : ""}`}
            >
              <input
                type="radio"
                name={name}
                value={level}
                checked={checked}
                className="sr-only"
                aria-label={label}
                onChange={() => onChange(level as Level)}
                onClick={() => {
                  if (checked) onChange(null);
                }}
              />
              <span aria-hidden className="font-cond text-[0.95rem] font-semibold leading-none sm:hidden">
                {short}
              </span>
              <span aria-hidden className="hidden font-cond text-[0.8rem] font-semibold leading-tight sm:block">
                {label}
              </span>
              <span aria-hidden className={`mt-1 h-3 ${checked ? "" : "invisible"}`}>
                <svg viewBox="0 0 12 12" className="size-3">
                  <path d="M1.8 6.6 4.8 9.4 10.4 2.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                </svg>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
