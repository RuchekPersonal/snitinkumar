import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/server/admin-auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm rounded-lg bg-cream p-6 shadow-xl sm:p-8">
        <p className="eyebrow text-[10px] text-maroon">Admin portal</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">S. Nitinkumar</h1>
        <p className="mt-1 text-[14px] text-muted">Staff sign-in</p>
        <LoginForm />
      </div>
    </main>
  );
}
