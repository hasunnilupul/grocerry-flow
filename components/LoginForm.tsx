"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <Label htmlFor="shopper">Your name</Label>
        <Input
          id="shopper"
          name="shopper"
          type="text"
          required
          maxLength={40}
          autoComplete="nickname"
          enterKeyHint="next"
          defaultValue={defaultShopper}
          aria-describedby="shopper-hint"
          className="h-12"
        />
        <span id="shopper-hint" className="text-sm text-muted-foreground">
          Shown on the trips you record.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="passcode">Household passcode</Label>
        <Input
          id="passcode"
          name="passcode"
          type="password"
          required
          autoComplete="current-password"
          enterKeyHint="done"
          className="h-12"
        />
      </div>

      {/* aria-live so the error is announced, not just drawn. */}
      <p aria-live="polite" className="min-h-5 text-sm text-warning">
        {state.error}
      </p>

      <Button type="submit" disabled={pending} className="h-12 text-base">
        {pending ? "Checking…" : "Open Grocery Flow"}
      </Button>
    </form>
  );
}
