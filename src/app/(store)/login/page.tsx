/* eslint-disable @next/next/no-img-element -- decorative static placeholder */
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { CheckIcon, WhatsAppIcon } from "@/components/icons";
import { waLink } from "@/lib/whatsapp";
import { site } from "@/lib/site";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server/session";
import { OtpLogin } from "./otp-login";

export const metadata: Metadata = pageMeta({
  title: "Retailer Login & Registration",
  description: "Register your shop once to see wholesale rates, save your details and reorder in two taps.",
  path: "/login",
});

const registerText = `Hello ${site.name}, I want to register my shop for wholesale rates.\nShop name: \nOwner name: \nCity: \nGSTIN (optional): `;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const viewer = await getViewer();
  if (viewer.retailerId) redirect("/account");
  const register = (await searchParams).tab === "register";
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
          <nav
            className="grid grid-cols-2 rounded-md bg-cream p-1 text-[14px] font-semibold"
            aria-label="Log in or register"
          >
            <Link
              href="/login"
              replace
              aria-current={!register ? "page" : undefined}
              className={`rounded py-2.5 text-center ${!register ? "bg-surface shadow-card" : "text-muted"}`}
            >
              Log in
            </Link>
            <Link
              href="/login?tab=register"
              replace
              aria-current={register ? "page" : undefined}
              className={`rounded py-2.5 text-center ${register ? "bg-surface shadow-card" : "text-muted"}`}
            >
              Register shop
            </Link>
          </nav>
          <h2 id="login-h" className="mt-6 font-serif text-2xl font-semibold">
            {register ? "Register your shop" : "Welcome back"}
          </h2>

          <OtpLogin key={register ? "register" : "login"} mode={register ? "register" : "login"} />

          <div className="my-6 flex items-center gap-3 text-[13px] text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <a
            href={waLink(registerText)}
            className="flex h-12 items-center justify-center gap-2 rounded-md border border-whatsapp font-semibold text-whatsapp"
          >
            <WhatsAppIcon /> Register on WhatsApp instead
          </a>
          <p className="mt-6 text-[13px] text-muted">
            New retailer? Registration needs shop name, city, GSTIN (optional) and mobile. Approved the same day.
          </p>
          <p className="mt-2 text-[13px] text-muted">
            <Link href="/" className="underline">
              Back to store
            </Link>{" "}
            ·{" "}
            <Link href="/admin/login" className="underline">
              Staff? Go to admin portal
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
