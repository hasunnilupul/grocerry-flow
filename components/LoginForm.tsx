"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";

const INITIAL: LoginState = { error: null };

export default function LoginForm({
  next,
  defaultShopper,
}: {
  next: string;
  defaultShopper: string;
}) {
  const [state, formAction, pending] = useActionState(login, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-2">
        <label htmlFor="shopper" className="text-sm font-medium">
          Your name
        </label>
        <input
          id="shopper"
          name="shopper"
          type="text"
          required
          maxLength={40}
          autoComplete="nickname"
          enterKeyHint="next"
          defaultValue={defaultShopper}
          aria-describedby="shopper-hint"
          className="min-h-12 rounded-xl border border-line bg-surface px-4 py-3"
        />
        <span id="shopper-hint" className="text-sm text-muted">
          Shown on the trips you record.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="passcode" className="text-sm font-medium">
          Household passcode
        </label>
        <input
          id="passcode"
          name="passcode"
          type="password"
          required
          autoComplete="current-password"
          enterKeyHint="done"
          className="min-h-12 rounded-xl border border-line bg-surface px-4 py-3"
        />
      </div>

      {/* aria-live so the error is announced, not just drawn. */}
      <p aria-live="polite" className="min-h-5 text-sm text-warning">
        {state.error}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-xl bg-accent px-4 py-3 font-semibold text-on-accent disabled:opacity-60"
      >
        {pending ? "Checking…" : "Open Grocery Flow"}
      </button>
    </form>
  );
}
