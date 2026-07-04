export type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong";

export interface PasswordStrengthResult {
  score: number;
  level: PasswordStrengthLevel;
  label: string;
  barCount: 1 | 2 | 3 | 4;
  barColor: string;
  textColor: string;
  isAcceptable: boolean;
}

const LEVELS: Record<
  PasswordStrengthLevel,
  { label: string; barCount: 1 | 2 | 3 | 4; barColor: string; textColor: string }
> = {
  weak: {
    label: "Weak",
    barCount: 1,
    barColor: "bg-red-500",
    textColor: "text-red-600",
  },
  fair: {
    label: "Fair",
    barCount: 2,
    barColor: "bg-amber-500",
    textColor: "text-amber-600",
  },
  good: {
    label: "Good",
    barCount: 3,
    barColor: "bg-sky-500",
    textColor: "text-sky-600",
  },
  strong: {
    label: "Strong",
    barCount: 4,
    barColor: "bg-mercurius-600",
    textColor: "text-mercurius-700",
  },
};

function scorePassword(password: string): number {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  return score;
}

function scoreToLevel(score: number, length: number): PasswordStrengthLevel {
  if (length < 6) return "weak";
  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score <= 4) return "good";
  return "strong";
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const score = scorePassword(password);
  const level = scoreToLevel(score, password.length);
  const meta = LEVELS[level];

  return {
    score,
    level,
    label: meta.label,
    barCount: meta.barCount,
    barColor: meta.barColor,
    textColor: meta.textColor,
    isAcceptable: password.length >= 6 && score >= 2,
  };
}