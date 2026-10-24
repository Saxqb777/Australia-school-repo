"use client";

import { useState } from "react";
import { RATING_LEVELS } from "@/db/seed-data/rubric";
import type { Level } from "@/lib/judgement";
import { PERCENTAGE_CRITERIA, suggestLevel, termForPercent, wholePercent, type PercentageCriterionCode } from "@/lib/percentage";

interface Props {
  code: PercentageCriterionCode;
  defaultPresent: string;
  disabled: boolean;
  onUse: (level: Level) => void;
}

function NumberBox({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-xs leading-tight text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        className="field mt-1 !py-2 font-mono"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
      />
    </div>
  );
}

/** Counts students against the form's percentage key and suggests a level. Nothing here is saved. */
export function PercentageHelper({ code, defaultPresent, disabled, onUse }: Props) {
  const labels = PERCENTAGE_CRITERIA[code];
  const [present, setPresent] = useState(defaultPresent);
  const [better, setBetter] = useState("");
  const [atLeast, setAtLeast] = useState("");
  const p = Number(present);
  const b = Number(better);
  const a = Number(atLeast);
  const ready = present !== "" && better !== "" && atLeast !== "";
  const suggestion = ready ? suggestLevel(p, b, a) : null;
  const describe = (count: number) => {
    const pct = wholePercent(count, p);
    if (pct === null) return null;
    return `${pct}% · ${termForPercent(pct)?.term ?? ""}`;
  };

  return (
    <details className="group mt-3 border border-dashed border-rule-strong bg-paper/60">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-medium text-navy [&::-webkit-details-marker]:hidden">
        Count students with the percentage key
        <span aria-hidden className="font-mono text-xs group-open:rotate-45">+</span>
      </summary>
      <div className="space-y-3 border-t border-dashed border-rule-strong px-3 pb-3 pt-3">
        <div className="grid grid-cols-3 gap-2">
          <NumberBox id={`${code}-present`} label="Students present" value={present} onChange={setPresent} />
          <NumberBox id={`${code}-better`} label={labels.betterLabel} value={better} onChange={setBetter} />
          <NumberBox id={`${code}-atleast`} label={labels.atLeastLabel} value={atLeast} onChange={setAtLeast} />
        </div>
        {ready ? (
          suggestion ? (
            <div className="text-sm">
              <p className="text-ink-soft">
                {labels.betterLabel}: <span className="font-mono text-ink">{describe(b)}</span>
                <br />
                {labels.atLeastLabel}: <span className="font-mono text-ink">{describe(a)}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p>
                  Suggests <strong>{RATING_LEVELS[suggestion.level - 1]?.label}</strong>{" "}
                  <span className="text-ink-soft">({suggestion.reason})</span>
                </p>
                <button
                  type="button"
                  disabled={disabled}
                  className="btn btn-quiet !min-h-9 !px-3 !text-sm"
                  onClick={() => onUse(suggestion.level)}
                >
                  Use {RATING_LEVELS[suggestion.level - 1]?.label}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              Check the numbers: neither count can be more than the students present, and the first count is part of the
              second.
            </p>
          )
        ) : (
          <p className="text-sm text-ink-soft">Enter all three numbers to see the term from the form&rsquo;s key and a suggested level.</p>
        )}
        <p className="text-xs text-ink-faint">A suggestion only. You choose the rating.</p>
      </div>
    </details>
  );
}
