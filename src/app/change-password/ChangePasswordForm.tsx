"use client";

import { useActionState } from "react";
import { changePasswordAction, type FormState } from "@/app/actions/auth-actions";
import { SubmitButton } from "@/components/SubmitButton";

const initial: FormState = { error: null };

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="current" className="label-caps block">
          Current password
        </label>
        <input id="current" name="current" type="password" className="field" autoComplete="current-password" required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="next" className="label-caps block">
          New password
        </label>
        <input
          id="next"
          name="next"
          type="password"
          className="field"
          autoComplete="new-password"
          minLength={10}
          aria-describedby="next-hint"
          required
        />
        <p id="next-hint" className="text-sm text-ink-soft">
          At least 10 characters.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className="label-caps block">
          Repeat new password
        </label>
        <input id="confirm" name="confirm" type="password" className="field" autoComplete="new-password" required />
      </div>
      {state.error ? (
        <p role="alert" className="border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pendingLabel="Saving…">Save new password</SubmitButton>
    </form>
  );
}
