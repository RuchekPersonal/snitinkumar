/* eslint-disable @next/next/no-img-element -- decorative static placeholder */
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { CheckIcon, WhatsAppIcon } from "@/components/icons";
import { waLink } from "@/lib/whatsapp";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Retailer Login & Registration",
  description: "Register your shop once to see wholesale rates, save your details and reorder in two taps.",
  path: "/login",
});

const registerText = `Hello ${site.name}, I want to register my shop for wholesale rates.\nShop name: \nOwner name: \nCity: \nGSTIN (optional): `;

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6 lg:pt-12">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <section>
          <p className="eyebrow text-gold-600">Trade account</p>
          <h1 className="mt-2 font-serif text-[34px] leading-tight font-semibold lg:text-5xl">
            Register your shop once, reorder in two taps.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Trade accounts see wholesale rates and live stock, get the rate card PDF, and can repeat any past enquiry
            from their history.
          </p>
          <ul className="mt-5 space-y-2.5 text-[15px]">
            {[
              "Wholesale rates & new-arrival alerts",
              "Saved GSTIN, shop address and transport preference",
              "Enquiry history with status: New · Confirmed · Dispatched",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <CheckIcon className="mt-0.5 shrink-0 text-maroon" /> {t}
              </li>
            ))}
          </ul>
          <img
            src="/placeholders/shop-floor.svg"
            alt=""
            className="mt-8 hidden aspect-[4/3] w-full rounded-lg object-cover lg:block"
          />
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 sm:p-8" aria-labelledby="login-h">
          <div className="grid grid-cols-2 rounded-md bg-cream p-1 text-[14px] font-semibold">
            <span className="rounded bg-surface py-2.5 text-center shadow-card">Log in</span>
            <span className="py-2.5 text-center text-muted">Register shop</span>
          </div>
          <h2 id="login-h" className="mt-6 font-serif text-2xl font-semibold">
            Welcome back
          </h2>

          <form className="mt-5 space-y-4" aria-describedby="login-soon">
            <label className="block">
              <span className="eyebrow text-muted">Mobile number</span>
              <div className="mt-2 flex h-12 overflow-hidden rounded-md border border-line bg-cream/40">
                <span className="grid place-items-center border-r border-line px-3 text-[15px] font-medium">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  disabled
                  className="flex-1 bg-transparent px-3 text-[16px]"
                />
              </div>
            </label>
            <button
              type="button"
              disabled
              className="h-12 w-full rounded-md bg-maroon font-semibold text-white opacity-60"
            >
              Send OTP
            </button>
          </form>

          <p id="login-soon" className="mt-5 rounded-md bg-gold-50 p-4 text-[14px] leading-relaxed">
            <b>OTP login is being set up.</b> Until then, register your shop on WhatsApp and we&apos;ll share rates
            directly.
          </p>
          <a
            href={waLink(registerText)}
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-md bg-whatsapp font-semibold text-white"
          >
            <WhatsAppIcon /> Register on WhatsApp
          </a>
          <p className="mt-6 text-[13px] text-muted">
            New retailer? Registration needs shop name, city, GSTIN (optional) and mobile. Approved the same day.
          </p>
          <p className="mt-2 text-[13px]">
            <Link href="/" className="text-muted underline">
              Back to store
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
