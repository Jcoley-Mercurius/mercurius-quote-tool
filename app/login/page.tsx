"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? undefined;
  const initialEmail = searchParams.get("email") ?? undefined;
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";

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
    <div className="py-8">
      <Suspense
        fallback={
          <div className="mx-auto flex max-w-md flex-col items-center py-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-mercurius-200 border-t-mercurius-600" />
            <p className="mt-4 text-sm text-slate-500">Loading sign in...</p>
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}