import { numberFormatter } from "@/lib/dashboard/format";
import type { MetricResult } from "@/lib/dashboard/types";

export function MetricState({
  result,
  loading = false,
}: {
  result: MetricResult<number>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <span role="status" className="inline-block h-8 w-14 animate-pulse rounded bg-slate-200">
        <span className="sr-only">Loading metric</span>
      </span>
    );
  }
  if (result.status === "ready") {
    return <span>{numberFormatter.format(result.value)}</span>;
  }
  if (result.status === "error") {
    return <span className="text-sm font-medium text-red-700">Couldn&apos;t load</span>;
  }
  return <span className="text-sm font-medium text-slate-500">Unavailable</span>;
}
