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
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    if (next !== "signup") setPassword("");
    setShowPassword(false);
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
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100";

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
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-11`}
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-slate-600"
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {mode === "signup" && (
              <PasswordStrengthIndicator password={password} />
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitDisabled}
          className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
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
              className="font-semibold text-emerald-700 hover:text-emerald-800"
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
              className="font-semibold text-emerald-700 hover:text-emerald-800"
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
              className="font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Sign in
            </button>
          </>
        )}
      </p>

      <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4 shrink-0 text-emerald-600"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
        <span>
          Your quotes are encrypted and never shared with unauthorized vendors.
        </span>
      </div>
    </div>
  );
}