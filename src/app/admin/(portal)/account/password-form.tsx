"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/admin/_actions/auth";
import { btnPrimary, input, label } from "@/components/admin/ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {(
        [
          ["current", "Current password", "current-password"],
          ["next", "New password (10+ characters)", "new-password"],
          ["confirm", "Repeat new password", "new-password"],
        ] as const
      ).map(([name, text, ac]) => (
        <div key={name}>
          <label htmlFor={name} className={label}>
            {text}
          </label>
          <input id={name} name={name} type="password" autoComplete={ac} required className={input} />
        </div>
      ))}
      {state?.error && <p className="text-[14px] font-medium text-maroon">{state.error}</p>}
      {state?.ok && <p className="text-[14px] font-medium text-whatsapp">{state.ok}</p>}
      <button disabled={pending} className={btnPrimary}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
