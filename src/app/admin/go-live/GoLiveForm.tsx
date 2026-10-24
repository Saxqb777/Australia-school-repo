"use client";

import { useActionState } from "react";
import { goLiveAction, type GoLiveState } from "@/app/actions/golive-actions";

const initial: GoLiveState = { error: null };

export function GoLiveForm() {
  const [state, action, pending] = useActionState(goLiveAction, initial);
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="confirm" className="label-caps block">
        Type GO LIVE to confirm
      </label>
      <input id="confirm" name="confirm" className="field max-w-xs font-mono uppercase" autoComplete="off" required />
      {state.error ? (
        <p role="alert" className="border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Going live…" : "Go live"}
      </button>
    </form>
  );
}
