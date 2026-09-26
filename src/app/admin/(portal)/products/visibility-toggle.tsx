"use client";

import { useOptimistic, useTransition } from "react";
import { setVisibilityAction } from "@/app/admin/_actions/products";

export function VisibilityToggle({ id, visible, code }: { id: string; visible: boolean; code: string }) {
  const [pending, start] = useTransition();
  const [on, setOn] = useOptimistic(visible);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`Show ${code} in store`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOn(!on);
          await setVisibilityAction(id, !on);
        })
      }
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-maroon" : "bg-sand"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}
