import {
  formatCustomerName,
  formatOpportunityDate,
} from "@/lib/opportunities/format";
import {
  OPPORTUNITY_ORIGIN_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_STYLES,
  type OpportunityListItem as OpportunityListItemData,
} from "@/lib/opportunities/types";

export function OpportunityListItem({
  item,
  assignmentLabel,
}: {
  item: OpportunityListItemData;
  assignmentLabel: string;
}) {
  return (
    <Link
      href={`/opportunities/${encodeURIComponent(item.id)}`}
      className="block rounded-2xl outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      aria-label={`View opportunity: ${item.title}`}
    >
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            {item.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{item.serviceType}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
            Source: {OPPORTUNITY_ORIGIN_LABELS[item.origin]}
          </span>
          <span
            className={[
              "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
              OPPORTUNITY_STATUS_STYLES[item.status],
            ].join(" ")}
          >
            Status: {OPPORTUNITY_STATUS_LABELS[item.status]}
          </span>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Detail
          term="Customer"
          detail={formatCustomerName(
            item.customerName ? { display_name: item.customerName } : null
          )}
        />
        <Detail
          term="Property"
          detail={item.propertyLabel || "Property details unavailable"}
        />
        <Detail term="Assignment" detail={assignmentLabel} />
        <Detail term="Updated" detail={formatOpportunityDate(item.updatedAt)} />
      </dl>
    </article>
    </Link>
  );
}

function Detail({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {term}
      </dt>
      <dd className="mt-1 break-words font-medium text-slate-700">{detail}</dd>
    </div>
  );
}
import Link from "next/link";
