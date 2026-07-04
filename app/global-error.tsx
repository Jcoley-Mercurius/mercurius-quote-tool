"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-50 font-sans text-slate-900">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
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
          <h1 className="text-xl font-semibold">Mercurius Quote hit a snag</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            The app encountered an unexpected error. Refresh the page or try
            again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-xl bg-mercurius-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-mercurius-700"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}