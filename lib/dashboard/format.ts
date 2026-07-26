export const numberFormatter = new Intl.NumberFormat("en-US");

export function formatDashboardDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatRelativeDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) /
      86_400_000
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
