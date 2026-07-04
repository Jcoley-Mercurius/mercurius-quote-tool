interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-2",
};

export function LoadingSpinner({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={[
        "animate-spin rounded-full border-mercurius-200 border-t-mercurius-600",
        sizeClasses[size],
        className,
      ].join(" ")}
    />
  );
}