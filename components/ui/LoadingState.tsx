import { LoadingSpinner } from "./LoadingSpinner";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Loading...",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={[
        "mx-auto flex max-w-lg flex-col items-center py-20 text-center",
        className,
      ].join(" ")}
    >
      <LoadingSpinner />
      <p className="mt-4 text-sm text-slate-500">{message}</p>
    </div>
  );
}