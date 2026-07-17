"use client";

import { SERVICE_OPTIONS, type ServiceType } from "./types";

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  hvac: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9-9h-2.25M5.25 12H3m15.364-6.364-1.591 1.591M7.227 16.773l-1.591 1.591m12.728 0-1.591-1.591M7.227 7.227 5.636 5.636" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  ),
  pool: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0M4 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h8l-1 4H9L8 6z" />
    </svg>
  ),
  lawn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V9m0 0C9 9 7 7 7 4c3 1 5 3 5 5zm0 0c3 0 5-2 5-5-3 1-5 3-5 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21h16" />
    </svg>
  ),
  plumbing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 4h2a2 2 0 0 1 2 2v2M10 20H8a2 2 0 0 1-2-2v-2M20 10v2a2 2 0 0 1-2 2h-2M4 14v-2a2 2 0 0 1 2-2h2" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  roofing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 12 9-7 9 7M5 10v9h14v-9" />
    </svg>
  ),
  electrical: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  ),
  general: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l4.655-5.653" />
    </svg>
  ),
};

interface ServiceTypeSelectorProps {
  value: ServiceType | "";
  onChange: (value: ServiceType) => void;
  error?: string;
}

export function ServiceTypeSelector({
  value,
  onChange,
  error,
}: ServiceTypeSelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SERVICE_OPTIONS.map((service) => {
          const isSelected = value === service.id;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onChange(service.id)}
              className={[
                "group relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all duration-150",
                isSelected
                  ? "border-mercurius-500 bg-mercurius-50 shadow-sm ring-1 ring-mercurius-500/20"
                  : "border-slate-200 bg-white hover:border-mercurius-300 hover:bg-slate-50",
              ].join(" ")}
            >
              <div
                className={[
                  "mb-3 rounded-lg p-2 transition-colors",
                  isSelected
                    ? "bg-mercurius-500 text-white"
                    : "bg-slate-100 text-slate-600 group-hover:bg-mercurius-100 group-hover:text-mercurius-700",
                ].join(" ")}
              >
                {SERVICE_ICONS[service.id]}
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {service.label}
              </span>
              <span className="mt-0.5 text-xs text-slate-500">
                {service.description}
              </span>
              {service.swflNote && (
                <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 group-hover:bg-mercurius-100 group-hover:text-mercurius-700">
                  {service.swflNote}
                </span>
              )}
              {isSelected && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-mercurius-500 text-white">
                  <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3">
                    <path d="M10.28 2.28 4.5 8.06 1.72 5.28l-.94.94 3.72 3.72 6.72-6.72-.94-.94z" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1" role="alert">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}