"use client";

import { useActionState } from "react";
import { saveRubricAction, type SetupState } from "@/app/actions/setup-actions";
import { RATING_LEVELS } from "@/db/seed-data/rubric";
import type { Level } from "@/lib/judgement";

const empty: SetupState = { ok: false, message: null };

export function CriterionEditor({ id, code, name, descriptors }: { id: number; code: string; name: string; descriptors: Record<Level, string> }) {
  const [state, action, pending] = useActionState(saveRubricAction, empty);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="criterionId" value={id} />
      <label className="block text-xs text-ink-soft">
        <span className="font-mono">{code}</span> Criterion wording
        <input name="name" className="field !py-2 font-medium" defaultValue={name} />
      </label>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {RATING_LEVELS.map((l) => (
          <label key={l.level} className="block text-xs text-ink-soft">
            {l.label}
            <textarea name={`level-${l.level}`} className="field min-h-24 !text-sm leading-snug" defaultValue={descriptors[l.level]} />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-quiet !min-h-9 !text-sm" disabled={pending}>
          {pending ? "Saving…" : `Save ${code}`}
        </button>
        {state.message ? <span role="status" className="text-sm text-ink-soft">{state.message}</span> : null}
      </div>
    </form>
  );
}
