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
    eyebrow: "Create",
    title: "AI Quote Generation",
    description:
      "Turn project details into polished, itemized quotes in minutes—with labor, materials, and local market factors already considered.",
    icon: <SparklesIcon />,
    wide: true,
  },
  {
    eyebrow: "Visualize",
    title: "Reimagine Visualization",
    description:
      "Help homeowners picture the finished project with clear, compelling AI-assisted visual concepts.",
    icon: <ImageIcon />,
  },
  {
    eyebrow: "Compare",
    title: "Transparent Pricing",
    description:
      "Present easy-to-understand options so clients can compare scope, materials, and total investment with confidence.",
    icon: <ReceiptIcon />,
  },
  {
    eyebrow: "Convert",
    title: "Client Portal & Acceptance",
    description:
      "Deliver quotes through a professional client experience with simple review, selection, and digital acceptance.",
    icon: <ClientIcon />,
  },
  {
    eyebrow: "Local Insight",
    title: "Local SWFL Expertise",
    description:
      "Build estimates informed by Southwest Florida housing, weather, permit, and regional pricing considerations.",
    icon: <PinIcon />,
  },
  {
    eyebrow: "Manage",
    title: "Vendor Dashboard",
    description:
      "Track active quotes, client decisions, and opportunities from one focused workspace built for service professionals.",
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
            Built for better quoting
          </p>
          <h2
            id="mercurius-features-title"
            className="text-balance text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl"
          >
            Everything you need to quote, present, and win the work.
          </h2>
          <p className="max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg">
            Mercurius brings intelligent estimating and a polished homeowner
            experience into one streamlined platform.
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
