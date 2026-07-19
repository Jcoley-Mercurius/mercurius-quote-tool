"use client";

import { useState, type ReactNode } from "react";

export interface ServiceType {
  id: string;
  label: string;
  icon: ReactNode;
}

interface ServiceTypeSelectorProps {
  services?: ServiceType[];
  value?: string;
  defaultValue?: string;
  onSelect?: (service: ServiceType) => void;
  className?: string;
}

function ServiceIcon({ type }: { type: string }) {
  const paths: Record<string, ReactNode> = {
    hvac: (
      <>
        <circle cx="12" cy="12" r="2.5" />
        <path d="M12 9.5c-1-3-1-5 1-6 2.5 1 3 3.5 1.5 6M14.2 13.2c3.1.4 5 .9 5.3 3.1-1.7 2.1-4.2 1.7-6-.7M9.8 13.2c-2.1 2.4-3.6 3.7-5.6 2.6-.8-2.5.9-4.4 3.4-5M9.8 10.8C7.7 8.4 6.2 6.9 7.4 5c2.5-.7 4.2 1.1 4.5 3.8" />
      </>
    ),
    pool: (
      <>
        <path d="M4 15c1.3 0 1.3-1 2.7-1s1.3 1 2.6 1 1.4-1 2.7-1 1.3 1 2.7 1 1.3-1 2.6-1 1.4 1 2.7 1M4 19c1.3 0 1.3-1 2.7-1s1.3 1 2.6 1 1.4-1 2.7-1 1.3 1 2.7 1 1.3-1 2.6-1 1.4 1 2.7 1" />
        <path d="M8 12V6a2 2 0 0 1 4 0M8 9h7V6a2 2 0 0 1 4 0" />
      </>
    ),
    lawn: (
      <>
        <path d="M5 20c0-7 3-12 7-16 1 7-1 13-7 16Z" />
        <path d="M5 20c3-5 7-8 13-10 0 6-5 10-13 10Z" />
      </>
    ),
    plumbing: (
      <path d="M14 3v4a2 2 0 0 0 2 2h2M10 3v4a6 6 0 0 0 6 6h2M18 6v6M18 16v5M15 18h6" />
    ),
    electrical: <path d="m13 2-8 12h7l-1 8 8-13h-7l1-7Z" />,
    roofing: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-7"
    >
      {paths[type] ?? paths.lawn}
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-3">
      <path
        d="m3.5 8 3 3 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const sampleServices: ServiceType[] = [
  { id: "hvac", label: "HVAC", icon: <ServiceIcon type="hvac" /> },
  { id: "pool", label: "Pool", icon: <ServiceIcon type="pool" /> },
  { id: "lawn", label: "Lawn", icon: <ServiceIcon type="lawn" /> },
  {
    id: "plumbing",
    label: "Plumbing",
    icon: <ServiceIcon type="plumbing" />,
  },
  {
    id: "electrical",
    label: "Electrical",
    icon: <ServiceIcon type="electrical" />,
  },
  { id: "roofing", label: "Roofing", icon: <ServiceIcon type="roofing" /> },
];

export function ServiceTypeSelector({
  services = sampleServices,
  value,
  defaultValue,
  onSelect,
  className = "",
}: ServiceTypeSelectorProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedId = value ?? internalValue;
  function selectService(service: ServiceType) {
    if (value === undefined) {
      setInternalValue(service.id);
    }
    onSelect?.(service);
  }
  return (
    <fieldset className={`flex min-w-0 flex-col gap-4 ${className}`}>
      <legend className="text-base font-semibold text-slate-950">
        Select a service type
      </legend>
      <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3">
        {services.map((service) => {
          const selected = selectedId === service.id;
          return (
            <button
              key={service.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => selectService(service)}
              className={[
                "relative flex min-h-28 flex-col items-center justify-center gap-3",
                "rounded-2xl border p-4 text-center transition duration-200",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
                "motion-reduce:transition-none",
                selected
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-emerald-500 hover:text-emerald-700 hover:shadow-sm motion-reduce:transform-none",
              ].join(" ")}
            >
              {selected && (
                <span className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <CheckIcon />
                  <span className="sr-only">Selected</span>
                </span>
              )}
              <span
                className={[
                  "flex size-11 items-center justify-center rounded-xl transition-colors",
                  selected
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                {service.icon}
              </span>
              <span
                className={[
                  "text-sm font-semibold",
                  selected ? "text-emerald-900" : "text-slate-900",
                ].join(" ")}
              >
                {service.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
