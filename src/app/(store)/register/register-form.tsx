"use client";

import { useActionState } from "react";
import { registerAction } from "../_actions/account";

const fields = [
  { name: "shopName", label: "Shop name", required: true, autoComplete: "organization" },
  { name: "ownerName", label: "Your name", required: true, autoComplete: "name" },
  { name: "city", label: "City", required: true, autoComplete: "address-level2" },
  { name: "state", label: "State", autoComplete: "address-level1" },
  { name: "pincode", label: "Pincode", inputMode: "numeric", autoComplete: "postal-code" },
  { name: "gstin", label: "GSTIN (optional)", autoCapitalize: "characters" },
  { name: "address", label: "Shop address", wide: true, autoComplete: "street-address" },
  {
    name: "transportPref",
    label: "Preferred transport (optional)",
    wide: true,
    placeholder: "e.g. VRL Logistics, Surat",
  },
] as const;

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <label key={f.name} className={`block ${"wide" in f && f.wide ? "sm:col-span-2" : ""}`}>
          <span className="eyebrow text-muted">{f.label}</span>
          <input
            name={f.name}
            required={"required" in f && f.required}
            defaultValue={state?.fields?.[f.name] ?? ""}
            autoComplete={"autoComplete" in f ? f.autoComplete : undefined}
            inputMode={"inputMode" in f ? f.inputMode : undefined}
            autoCapitalize={"autoCapitalize" in f ? f.autoCapitalize : undefined}
            placeholder={"placeholder" in f ? f.placeholder : undefined}
            className="mt-2 h-12 w-full rounded-md border border-line bg-cream/40 px-3 text-[16px] focus:border-gold focus:outline-none"
          />
        </label>
      ))}
      {state?.error && (
        <p role="alert" className="text-[14px] font-medium text-maroon sm:col-span-2">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="h-12 rounded-md bg-maroon font-semibold text-white disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "Registering…" : "Register shop"}
      </button>
    </form>
  );
}
