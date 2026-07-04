"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  toastDismiss,
  toastError,
  toastLoading,
  toastSuccess,
} from "@/lib/ui/toast";
import { evaluatePasswordStrength } from "@/lib/validation/password-strength";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";
import { useAuth } from "./AuthProvider";

export function ResetPasswordForm() {
  const router = useRouter();
  const { user, isLoading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = evaluatePasswordStrength(password);
  const passwordsMatch =
    confirmPassword.length === 0 || password === confirmPassword;
  const canSubmit =
    !isSubmitting &&
    strength.isAcceptable &&
    password === confirmPassword &&
    confirmPassword.length > 0;

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition-colors focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!strength.isAcceptable) {
      toastError(
        null,
        "Choose a stronger password — at least 6 characters with letters and numbers."
      );
      return;
    }

    if (password !== confirmPassword) {
      toastError(null, "Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const loadingId = toastLoading("Updating password...");

    const result = await updatePassword(password);
    toastDismiss(loadingId);

    if (result.error) {
      toastError(result.error, "Could not update password. Please try again.");
    } else {
      toastSuccess("Password updated! You can now use your new password.");
      router.replace("/");
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mercurius-200 border-t-mercurius-600" />
        <p className="mt-4 text-sm text-slate-500">Verifying reset link...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Link expired or invalid</h2>
        <p className="mt-2 text-sm text-slate-600">
          Request a new password reset link from the sign-in page.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-xl bg-mercurius-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-mercurius-700"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Set a new password
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Choose a strong password for your Mercurius account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 6 characters"
            />
            <PasswordStrengthIndicator password={password} />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={[
                inputClass,
                !passwordsMatch ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "",
              ].join(" ")}
              placeholder="Re-enter your password"
            />
            {!passwordsMatch && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-mercurius-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-mercurius-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}