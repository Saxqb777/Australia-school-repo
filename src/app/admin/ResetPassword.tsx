"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetState } from "@/app/actions/admin-actions";

const initial: ResetState = { userId: null, name: null, username: null, password: null, error: null };

export function ResetPassword({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  if (state.password && state.userId === userId) {
    return (
      <span className="block text-left">
        <span className="block text-xs text-ink-soft">New temporary password for {state.username}, shown once:</span>
        <code className="block select-all bg-navy-wash px-2 py-1 font-mono text-sm">{state.password}</code>
      </span>
    );
  }
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Reset the password for ${name}? Their current password will stop working.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className="text-sm font-medium text-navy underline underline-offset-2">
        {pending ? "Resetting…" : "Reset password"}
      </button>
      {state.error ? <span className="block text-xs">{state.error}</span> : null}
    </form>
  );
}
