import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server/session";
import { getVerifiedPhone } from "@/lib/server/phone-verification";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Register your shop", robots: { index: false } };

export default async function RegisterPage() {
  const viewer = await getViewer();
  if (viewer.retailerId) redirect("/account");
  const phone = await getVerifiedPhone();
  if (!phone) redirect("/login?tab=register");

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 lg:pt-12">
      <p className="eyebrow text-gold-600">Trade account</p>
      <h1 className="mt-2 font-serif text-[32px] leading-tight font-semibold lg:text-4xl">Tell us about your shop</h1>
      <p className="mt-2 text-[15px] text-muted">
        Mobile <b className="text-ink">{phone.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2")}</b> is verified. We review
        new shops the same day — wholesale rates appear once approved.
      </p>
      <div className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-8">
        <RegisterForm />
      </div>
    </div>
  );
}
