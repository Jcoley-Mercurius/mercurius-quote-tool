"use client";

interface MobileQuoteActionBarProps {
  /** Show after the user begins filling out the form. */
  isVisible: boolean;
  /** Hide after the quote form is complete. */
  isComplete?: boolean;
  /** Called when Generate Quote is pressed. */
  onSubmit: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-5">
      <path
        d="M4 10h12m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5 animate-spin motion-reduce:animate-none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}

export function MobileQuoteActionBar({
  isVisible,
  isComplete = false,
  onSubmit,
  isSubmitting = false,
  disabled = false,
  label = "Generate Quote",
  className = "",
}: MobileQuoteActionBarProps) {
  if (!isVisible || isComplete) return null;

  return (
    <aside
      aria-label="Quote actions"
      className={[
        "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl",
        "border-x border-t border-slate-200 bg-white",
        "px-4 pt-4 shadow-[0_-8px_30px_rgba(15,23,42,0.10)]",
        "pb-[calc(1rem+env(safe-area-inset-bottom))]",
        "md:hidden",
        className,
      ].join(" ")}
    >
      <div className="mx-auto flex w-full max-w-lg">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || isSubmitting}
          aria-busy={isSubmitting}
          className={[
            "flex min-h-14 w-full items-center justify-center gap-3 rounded-xl",
            "bg-emerald-600 px-6 py-4 text-base font-semibold text-white",
            "shadow-sm transition duration-200",
            "hover:bg-emerald-700 active:scale-[0.99]",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:bg-slate-300",
            "disabled:text-slate-600 disabled:shadow-none",
            "motion-reduce:transform-none motion-reduce:transition-none",
          ].join(" ")}
        >
          {isSubmitting ? (
            <>
              <LoadingIcon />
              <span>Generating quote…</span>
            </>
          ) : (
            <>
              <span>{label}</span>
              <ArrowIcon />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
