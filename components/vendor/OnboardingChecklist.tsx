"use client";

import { useMemo, useState } from "react";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  optional?: boolean;
  completed?: boolean;
}

interface OnboardingChecklistProps {
  steps?: OnboardingStep[];
  title?: string;
  onDismiss?: () => void;
  onStepChange?: (steps: OnboardingStep[]) => void;
  className?: string;
}

export const sampleOnboardingSteps: OnboardingStep[] = [
  {
    id: "business-profile",
    title: "Complete business profile",
    description: "Add your company details and contact information.",
    completed: true,
  },
  {
    id: "labor-rate",
    title: "Set labor rate",
    description: "Choose the default hourly rate used in your quotes.",
    completed: false,
  },
  {
    id: "company-logo",
    title: "Add logo",
    description: "Personalize estimates with your company branding.",
    optional: true,
    completed: false,
  },
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
      <path
        d="m5 10 3 3 7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-5">
      <path
        d="m6 6 8 8m0-8-8 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function OnboardingChecklist({
  steps: initialSteps = sampleOnboardingSteps,
  title = "Set up your quote workspace",
  onDismiss,
  onStepChange,
  className = "",
}: OnboardingChecklistProps) {
  const [steps, setSteps] = useState(initialSteps);
  const [dismissed, setDismissed] = useState(false);

  const requiredSteps = useMemo(
    () => steps.filter((step) => !step.optional),
    [steps]
  );
  const completedRequiredSteps = requiredSteps.filter(
    (step) => step.completed
  ).length;
  const progress =
    requiredSteps.length > 0
      ? Math.round((completedRequiredSteps / requiredSteps.length) * 100)
      : 100;

  function toggleStep(id: string) {
    const updatedSteps = steps.map((step) =>
      step.id === id ? { ...step, completed: !step.completed } : step
    );
    setSteps(updatedSteps);
    onStepChange?.(updatedSteps);
  }

  function dismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  if (dismissed) return null;

  return (
    <section
      aria-labelledby="onboarding-title"
      className={`w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm font-semibold text-emerald-600">
              Getting started
            </p>
            <h2
              id="onboarding-title"
              className="text-balance text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
            >
              {title}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Complete these steps to create polished, accurate quotes.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss onboarding checklist"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-700">Setup progress</span>
            <span
              className="font-semibold tabular-nums text-emerald-600"
              aria-hidden="true"
            >
              {progress}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Required setup progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {completedRequiredSteps} of {requiredSteps.length} required steps
            complete
          </p>
        </div>
        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => toggleStep(step.id)}
                aria-pressed={Boolean(step.completed)}
                className={[
                  "group flex w-full flex-col gap-4 rounded-2xl border p-4 text-left transition sm:flex-row sm:items-center",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
                  step.completed
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-10 shrink-0 items-center justify-center rounded-xl border font-semibold transition-all duration-300 motion-reduce:transition-none",
                    step.completed
                      ? "scale-100 border-emerald-600 bg-emerald-600 text-white"
                      : "scale-95 border-slate-300 bg-white text-slate-500 group-hover:border-emerald-600 group-hover:text-emerald-600",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {step.completed ? <CheckIcon /> : index + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "font-semibold",
                        step.completed ? "text-emerald-900" : "text-slate-950",
                      ].join(" ")}
                    >
                      {step.title}
                    </span>
                    {step.optional && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Optional
                      </span>
                    )}
                  </span>
                  <span
                    className={[
                      "text-sm leading-6",
                      step.completed ? "text-emerald-800" : "text-slate-600",
                    ].join(" ")}
                  >
                    {step.description}
                  </span>
                </span>
                <span
                  className={[
                    "text-sm font-semibold sm:ml-auto",
                    step.completed ? "text-emerald-700" : "text-emerald-600",
                  ].join(" ")}
                >
                  {step.completed ? "Completed" : "Mark complete"}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
