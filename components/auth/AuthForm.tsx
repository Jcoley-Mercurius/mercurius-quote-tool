"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  markNewUserWelcomePending,
  markWelcomePending,
} from "@/lib/auth/welcome";
import { toastDismiss, toastError, toastLoading, toastSuccess } from "@/lib/ui/toast";
import { evaluatePasswordStrength } from "@/lib/validation/password-strength";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";
import { useAuth } from "./AuthProvider";

type AuthMode = "signin" | "signup" | "forgot";

interface AuthFormProps {
  redirectTo?: string;
  initialEmail?: string;
  initialMode?: AuthMode;
}

function isSafeRedirect(path: string | undefined): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

export function AuthForm({
  redirectTo,
  initialEmail,
  initialMode = "signin",
}: AuthFormProps = {}) {
  const router = useRouter();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    if (next !== "signup") setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (mode === "forgot") {
      if (!email.trim()) {
        toastError(null, "Please enter your email address.");
        setIsSubmitting(false);
        return;
      }

      const loadingId = toastLoading("Sending reset link...");
      const result = await resetPassword(email);
      toastDismiss(loadingId);
      if (result.error) {
        toastError(result.error, "Could not send reset email. Please try again.");
      } else {
        toastSuccess("Reset link sent! Check your email for instructions.");
        switchMode("signin");
      }
      setIsSubmitting(false);
      return;
    }

    if (mode === "signup") {
      const strength = evaluatePasswordStrength(password);
      if (!strength.isAcceptable) {
        toastError(
          null,
          "Choose a stronger password — at least 6 characters with letters and numbers."
        );
        setIsSubmitting(false);
        return;
      }
    }

    const loadingId = toastLoading(
      mode === "signin" ? "Signing in..." : "Creating account..."
    );

    if (mode === "signup") {
      const result = await signUp(email, password);
      toastDismiss(loadingId);

      if (result.error) {
        toastError(result.error, "Could not create account. Please try again.");
      } else {
        markNewUserWelcomePending();
        if (result.sessionCreated) {
          setPassword("");
          toastSuccess("Account created! You're signed in.");
          if (isSafeRedirect(redirectTo)) {
            router.push(redirectTo);
          }
        } else {
          toastSuccess(
            "Account created! Check your email to confirm, then sign in."
          );
          switchMode("signin");
        }
      }
    } else {
      const result = await signIn(email, password);
      toastDismiss(loadingId);
      if (result.error) {
        toastError(result.error, "Sign in failed. Please try again.");
      } else {
        markWelcomePending();
        if (isSafeRedirect(redirectTo)) {
          router.push(redirectTo);
        }
      }
    }

    setIsSubmitting(false);
  };

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition-colors focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20";

  const title =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your account"
        : "Reset your password";

  const subtitle =
    mode === "forgot"
      ? "Enter your email and we'll send you a link to reset your password."
      : "Sign in to save quotes and vendor settings across devices.";

  const signupStrength = evaluatePasswordStrength(password);
  const submitDisabled =
    isSubmitting ||
    (mode === "signup" && password.length > 0 && !signupStrength.isAcceptable);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mercurius-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-7 w-7 text-mercurius-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@company.com"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs font-medium text-mercurius-700 hover:text-mercurius-800"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="At least 6 characters"
              />
              {mode === "signup" && (
                <PasswordStrengthIndicator password={password} />
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitDisabled}
            className="w-full rounded-xl bg-mercurius-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-mercurius-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Please wait..."
              : mode === "signin"
                ? "Sign In"
                : mode === "signup"
                  ? "Create Account"
                  : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "forgot" ? (
            <>
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="font-semibold text-mercurius-700 hover:text-mercurius-800"
              >
                Back to sign in
              </button>
            </>
          ) : mode === "signin" ? (
            <>
              New to Mercurius?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="font-semibold text-mercurius-700 hover:text-mercurius-800"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="font-semibold text-mercurius-700 hover:text-mercurius-800"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}