"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/_actions/auth";
import { btnPrimary, input, label } from "@/components/admin/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className={label}>
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={`${input} h-11`} />
      </div>
      <div>
        <label htmlFor="password" className={label}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={`${input} h-11`}
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-[14px] font-medium text-maroon">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} h-11 w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
