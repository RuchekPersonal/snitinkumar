"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";

type Step = "phone" | "code";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Firebase is loaded only when someone asks for an OTP, keeping it out of every other page.
async function firebaseAuth() {
  const [{ initializeApp, getApps }, auth] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const instance = auth.getAuth(app);
  instance.languageCode = "en";
  return { auth, instance };
}

function friendly(code: string): string {
  switch (code) {
    case "auth/invalid-phone-number":
      return "That mobile number doesn't look right.";
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
      return "Too many OTP requests. Please wait a while and try again.";
    case "auth/invalid-verification-code":
      return "That OTP is incorrect. Please check the SMS and try again.";
    case "auth/code-expired":
      return "The OTP has expired. Please request a new one.";
    case "auth/captcha-check-failed":
    case "auth/unauthorized-domain":
      return "OTP login isn't enabled for this web address yet. Please register on WhatsApp for now.";
    case "auth/network-request-failed":
      return "No internet connection. Please check and try again.";
    default:
      return "Something went wrong sending the OTP. Please try again.";
  }
}

export function OtpLogin({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => () => verifier.current?.clear(), []);

  const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  const validPhone = /^[6-9]\d{9}$/.test(digits);

  async function sendOtp() {
    if (!validPhone) return setError("Enter your 10-digit mobile number.");
    setBusy(true);
    setError(null);
    try {
      const { auth, instance } = await firebaseAuth();
      verifier.current?.clear();
      verifier.current = new auth.RecaptchaVerifier(instance, "otp-recaptcha", { size: "invisible" });
      confirmation.current = await auth.signInWithPhoneNumber(instance, `+91${digits}`, verifier.current);
      setStep("code");
      setCode("");
      setResendIn(30);
    } catch (err) {
      setError(friendly((err as { code?: string }).code ?? ""));
      verifier.current?.clear();
      verifier.current = null;
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit OTP from the SMS.");
    if (!confirmation.current) return setStep("phone");
    setBusy(true);
    setError(null);
    try {
      const cred = await confirmation.current.confirm(code);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => ({}));
      // Our own session cookie is set now; the Firebase session is not needed any more.
      const { auth, instance } = await firebaseAuth();
      await auth.signOut(instance).catch(() => {});
      if (!res.ok) throw Object.assign(new Error(data.error), { server: true });
      router.replace(data.next);
      router.refresh();
    } catch (err) {
      const e = err as { code?: string; server?: boolean; message?: string };
      setError(e.server ? (e.message ?? "Could not sign in.") : friendly(e.code ?? ""));
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      {step === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendOtp();
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="eyebrow text-muted">Mobile number</span>
            <div className="mt-2 flex h-12 overflow-hidden rounded-md border border-line bg-cream/40 focus-within:border-gold">
              <span className="grid place-items-center border-r border-line px-3 text-[15px] font-medium">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={14}
                className="flex-1 bg-transparent px-3 text-[16px] focus:outline-none"
                aria-label="Mobile number"
              />
            </div>
          </label>
          <button
            disabled={busy}
            className="h-12 w-full rounded-md bg-maroon font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Sending OTP…" : "Send OTP"}
          </button>
          <p className="text-[13px] text-muted">
            {mode === "register"
              ? "We'll verify your number first, then ask for your shop details."
              : "Sent by SMS. New number? You can register your shop right after."}
          </p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyOtp();
          }}
          className="space-y-4"
        >
          <p className="text-[14px]">
            Enter the 6-digit code sent to <b>+91 {digits.replace(/(\d{5})(\d{5})/, "$1 $2")}</b>{" "}
            <button type="button" onClick={() => setStep("phone")} className="font-semibold text-maroon underline">
              Change
            </button>
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="h-14 w-full rounded-md border border-line bg-cream/40 text-center text-[24px] font-semibold tracking-[0.5em] focus:border-gold focus:outline-none"
            aria-label="One-time password"
            autoFocus
          />
          <button
            disabled={busy}
            className="h-12 w-full rounded-md bg-maroon font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Verifying…" : mode === "register" ? "Verify & continue" : "Log in"}
          </button>
          <p className="text-[13px] text-muted">
            Didn&apos;t get it?{" "}
            {resendIn > 0 ? (
              `Resend in ${resendIn}s`
            ) : (
              <button type="button" onClick={sendOtp} disabled={busy} className="font-semibold text-maroon underline">
                Resend OTP
              </button>
            )}
          </p>
        </form>
      )}
      {error && (
        <p role="alert" className="text-[14px] font-medium text-maroon">
          {error}
        </p>
      )}
      <div id="otp-recaptcha" />
    </div>
  );
}
