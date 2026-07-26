"use client";

import {
  OPPORTUNITY_ORIGINS,
  OPPORTUNITY_ORIGIN_LABELS,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_STATUS_LABELS,
  type OpportunityListFilters,
} from "@/lib/opportunities/types";

export function OpportunityFilters({
  filters,
  showAssignment = true,
  onChange,
}: {
  filters: OpportunityListFilters;
  showAssignment?: boolean;
  onChange: (filters: OpportunityListFilters) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <legend className="sr-only">Filter opportunities</legend>
      <div
        className={
          showAssignment
            ? "grid gap-4 sm:grid-cols-3"
            : "grid gap-4 sm:grid-cols-2"
        }
      >
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(status) =>
            onChange({ ...filters, status: status as OpportunityListFilters["status"] })
          }
        >
          <option value="active">Active</option>
          <option value="all">All statuses</option>
          {OPPORTUNITY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {OPPORTUNITY_STATUS_LABELS[status]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Source"
          value={filters.origin}
          onChange={(origin) =>
            onChange({ ...filters, origin: origin as OpportunityListFilters["origin"] })
          }
        >
          <option value="all">All sources</option>
          {OPPORTUNITY_ORIGINS.map((origin) => (
            <option key={origin} value={origin}>
              {OPPORTUNITY_ORIGIN_LABELS[origin]}
            </option>
          ))}
        </FilterSelect>

        {showAssignment ? (
          <FilterSelect
            label="Assignment"
            value={filters.assignment}
            onChange={(assignment) =>
              onChange({
                ...filters,
                assignment: assignment as OpportunityListFilters["assignment"],
              })
            }
          >
            <option value="all">All</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
            <option value="mine">Mine</option>
          </FilterSelect>
        ) : null}
      </div>
    </fieldset>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const id = `opportunity-filter-${label.toLowerCase()}`;
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
      >
        {children}
      </select>
    </label>
  );
}
