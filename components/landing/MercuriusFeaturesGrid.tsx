import type { ReactNode } from "react";

interface Feature {
  title: string;
  description: string;
  eyebrow: string;
  icon: ReactNode;
  wide?: boolean;
}

function SparklesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path
        d="m12 3 2.5 5.1 5.6.8-4 4 1 5.5-5.1-2.6-5.1 2.6 1-5.5-4-4 5.6-.8L12 3Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path
        d="m3 12 2.5 5.1 5.6.8-4 4 1 5.5-5.1-2.6-5.1 2.6 1-5.5-4-4 5.6-.8L3 12Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="m4 17.5 3 2.5 4-3.5 5 4 4-2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path
        d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M9 8h6M9 12h6M9 16h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClientIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path
        d="M12 3 5 6v5c0 4.8 2.9 8.1 7 10 4.1-1.9 7-5.2 7-10V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 8h8M8 12h8M8 16h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const features: Feature[] = [
  {
    eyebrow: "The core",
    title: "AI Repair Matching",
    description:
      "Our engine analyzes the repair, property, urgency, and vendor specialties to route each request to the pros most likely to win it — in seconds, not days.",
    icon: <SparklesIcon />,
    wide: true,
  },
  {
    eyebrow: "Capture",
    title: "AI Photo Analysis",
    description:
      "AI reads homeowner photos to gauge scope and severity, so matched vendors can quote accurately before the first visit.",
    icon: <ImageIcon />,
  },
  {
    eyebrow: "Compare",
    title: "Transparent Quotes",
    description:
      "Clear, itemized options let homeowners compare scope, materials, and total cost with confidence—no haggling.",
    icon: <ReceiptIcon />,
  },
  {
    eyebrow: "Convert",
    title: "Client Portal & Acceptance",
    description:
      "Vendors deliver quotes through a professional experience with simple review, selection, and digital acceptance.",
    icon: <ClientIcon />,
  },
  {
    eyebrow: "Local Insight",
    title: "Local SWFL Expertise",
    description:
      "Estimates informed by Southwest Florida housing, weather, permits, and regional repair pricing.",
    icon: <PinIcon />,
  },
  {
    eyebrow: "For Vendors",
    title: "Warm Leads & Vendor Dashboard",
    description:
      "Vendors receive qualified repair leads—not cold lists—and track requests, quotes, and won work from one focused workspace.",
    icon: <DashboardIcon />,
    wide: true,
  },
];

export function MercuriusFeaturesGrid() {
  return (
    <section
      aria-labelledby="mercurius-features-title"
      className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-12">
        <header className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
            Powered by AI matching
          </p>
          <h2
            id="mercurius-features-title"
            className="text-balance text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl"
          >
            Intelligent matching at the core of every repair.
          </h2>
          <p className="max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg">
            A smart marketplace that reads each job and connects homeowners with
            the best-fit local vendors — then streamlines every step from request
            to won work.
          </p>
        </header>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className={`group flex min-h-64 flex-col justify-between gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5 motion-reduce:transform-none motion-reduce:transition-none sm:p-8 ${
                feature.wide ? "lg:col-span-2" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  {feature.icon}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {feature.eyebrow}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-balance text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                  {feature.title}
                </h3>
                <p className="text-pretty text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
