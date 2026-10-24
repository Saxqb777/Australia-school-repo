"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/actions/auth-actions";
import { SubmitButton } from "@/components/SubmitButton";

const initial: FormState = { error: null };

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="username" className="label-caps block">
          Username
        </label>
        <input
          id="username"
          name="username"
          className="field"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="label-caps block">
          Password
        </label>
        <input id="password" name="password" type="password" className="field" autoComplete="current-password" required />
      </div>
      {state.error ? (
        <p role="alert" className="border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
