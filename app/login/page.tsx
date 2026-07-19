"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { TestimonialCarousel } from "@/components/ui/TestimonialCarousel";

const TRUST_STATS = [
  "2,400+ vetted vendors",
  "48hr average response",
  "100% licensed & insured",
] as const;

function MercuriusMark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-white shadow-sm ${className ?? ""}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-3/5 w-3/5 text-emerald-600"
      >
        <path
          d="M12 3 4 9.2V20a1 1 0 0 0 1 1h4v-6a3 3 0 0 1 6 0v6h4a1 1 0 0 0 1-1V9.2L12 3Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

function BrandLockup({ inverted = true }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <MercuriusMark className="h-10 w-10" />
      <span
        className={`text-xl font-bold tracking-tight ${inverted ? "text-white" : "text-slate-900"}`}
      >
        Mercurius
      </span>
    </div>
  );
}

function TrustPills({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${compact ? "" : "sm:gap-3"}`}>
      {TRUST_STATS.map((stat) => (
        <li
          key={stat}
          className={`rounded-full bg-white font-semibold text-emerald-600 shadow-sm ${
            compact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
          }`}
        >
          {stat}
        </li>
      ))}
    </ul>
  );
}

/** Decorative low-opacity property skyline for the brand panel. */
function HomePattern() {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 h-64 w-full text-white/[0.06]"
      viewBox="0 0 1200 300"
      preserveAspectRatio="xMidYMax slice"
      fill="currentColor"
      aria-hidden
    >
      <path d="M0 300V180l120-70 120 70v120H0Z" />
      <path d="M260 300V150l150-90 150 90v150H260Z" />
      <path d="M580 300V200l100-60 100 60v100H580Z" />
      <path d="M800 300V140l160-95 160 95v160H800Z" />
      <path d="M1120 300V190l80-48 80 48v110h-160Z" />
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? undefined;
  const initialEmail = searchParams.get("email") ?? undefined;
  const initialMode =
    searchParams.get("mode") === "signup" ? "signup" : "signin";

  return (
    <AuthForm
      redirectTo={redirectTo}
      initialEmail={initialEmail}
      initialMode={initialMode}
    />
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      {/* LEFT PANEL — brand storytelling (desktop) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-slate-900 to-emerald-950 lg:flex lg:w-[55%] lg:flex-col lg:justify-between lg:gap-8 lg:overflow-y-auto lg:p-14">
        <HomePattern />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative shrink-0">
          <BrandLockup />
        </div>

        <div className="relative max-w-xl">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
            Smart quotes. Trusted vendors. Your home, protected.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white/70">
            AI-powered home service quotes matched to your property — no
            haggling, no guesswork.
          </p>
        </div>

        <div className="relative">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-emerald-300/80">
            Loved by SWFL homeowners
          </p>
          <TestimonialCarousel className="max-w-xl" />
        </div>

        <div className="relative shrink-0">
          <TrustPills />
        </div>
      </aside>

      {/* MOBILE banner strip — collapsed value prop */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-emerald-950 px-6 py-8 lg:hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          <BrandLockup />
          <h1 className="mt-5 text-2xl font-bold leading-snug tracking-tight text-white">
            Smart quotes. Trusted vendors. Your home, protected.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            AI-powered home service quotes matched to your property — no
            haggling, no guesswork.
          </p>
          <div className="mt-5 flex justify-center">
            <TrustPills compact />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — auth form */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 sm:px-10 lg:w-[45%]">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <MercuriusMark className="h-11 w-11" />
          </div>
          <Suspense
            fallback={
              <div className="flex flex-col items-center py-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
                <p className="mt-4 text-sm text-slate-500">
                  Loading sign in...
                </p>
              </div>
            }
          >
            <LoginContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
