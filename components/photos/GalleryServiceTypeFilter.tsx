"use client";

import {
  SERVICE_OPTIONS,
  type ServiceType,
} from "@/components/quote-form/types";

interface GalleryServiceTypeFilterProps {
  selected: ServiceType[];
  onChange: (selected: ServiceType[]) => void;
}

export function GalleryServiceTypeFilter({
  selected,
  onChange,
}: GalleryServiceTypeFilterProps) {
  const toggle = (serviceType: ServiceType) => {
    onChange(
      selected.includes(serviceType)
        ? selected.filter((type) => type !== serviceType)
        : [...selected, serviceType]
    );
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">Service types</span>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-mercurius-700 transition hover:text-mercurius-800"
          >
            Clear ({selected.length})
          </button>
        ) : (
          <span className="text-xs text-slate-400">All services</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {SERVICE_OPTIONS.map((service) => {
          const isSelected = selected.includes(service.id);
          return (
            <label
              key={service.id}
              className={[
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                isSelected
                  ? "border-mercurius-300 bg-mercurius-50 text-mercurius-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(service.id)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-mercurius-600 focus:ring-mercurius-500/20"
              />
              {service.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}