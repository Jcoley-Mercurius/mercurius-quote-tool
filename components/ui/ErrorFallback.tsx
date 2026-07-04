"use client";

interface ErrorFallbackProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  showHomeLink?: boolean;
}

export function ErrorFallback({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  showHomeLink = true,
}: ErrorFallbackProps) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-6 w-6"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-mercurius-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-mercurius-700 focus:outline-none focus:ring-2 focus:ring-mercurius-500 focus:ring-offset-2"
          >
            {retryLabel}
          </button>
        )}
        {showHomeLink && (
          <a
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Go to home
          </a>
        )}
      </div>
    </div>
  );
}