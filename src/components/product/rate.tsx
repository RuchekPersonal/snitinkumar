import Link from "next/link";
import { rupees } from "@/lib/format";
import { LockIcon } from "@/components/icons";

/** Shows the rate when the server included it; otherwise a login prompt (guests never receive prices). */
export function Rate({ ratePaise, size = "md" }: { ratePaise?: number; size?: "md" | "lg" }) {
  if (ratePaise === undefined) {
    return (
      <Link
        href="/login"
        className={`inline-flex items-center gap-1 font-semibold text-maroon underline-offset-2 hover:underline ${
          size === "lg" ? "text-base" : "text-[13px]"
        }`}
      >
        <LockIcon width={size === "lg" ? 18 : 14} height={size === "lg" ? 18 : 14} />
        Log in for rate
      </Link>
    );
  }
  return (
    <span className="whitespace-nowrap">
      <span className={`font-bold text-ink ${size === "lg" ? "text-3xl" : "text-[17px]"}`}>{rupees(ratePaise)}</span>
      <span className="text-[13px] text-muted"> / pc</span>
    </span>
  );
}

export function MoqChip({ moq }: { moq: number }) {
  return (
    <span className="rounded bg-chip px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-chip-ink">
      Min {moq} pcs
    </span>
  );
}

export function NewBadge() {
  return <span className="rounded-sm bg-gold px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-ink">NEW</span>;
}
