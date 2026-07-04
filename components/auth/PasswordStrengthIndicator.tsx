"use client";

import {
  evaluatePasswordStrength,
  type PasswordStrengthResult,
} from "@/lib/validation/password-strength";

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirement?: boolean;
}

export function PasswordStrengthIndicator({
  password,
  showRequirement = true,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = evaluatePasswordStrength(password);

  return (
    <div className="mt-2 space-y-1.5" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 gap-1">
          <StrengthBars strength={strength} />
        </div>
        <span className={`text-xs font-medium ${strength.textColor}`}>
          {strength.label}
        </span>
      </div>
      {showRequirement && !strength.isAcceptable && password.length > 0 && (
        <p className="text-xs text-slate-500">
          Use at least 6 characters with a mix of letters and numbers.
        </p>
      )}
    </div>
  );
}

function StrengthBars({ strength }: { strength: PasswordStrengthResult }) {
  return (
    <>
      {[1, 2, 3, 4].map((segment) => (
        <div
          key={segment}
          className={[
            "h-1.5 flex-1 rounded-full transition-colors",
            segment <= strength.barCount ? strength.barColor : "bg-slate-200",
          ].join(" ")}
        />
      ))}
    </>
  );
}

export { evaluatePasswordStrength };