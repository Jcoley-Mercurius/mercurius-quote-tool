import type { ReactNode } from "react";

interface Benefit {
  title: string;
  description: string;
  icon: ReactNode;
}

function MatchingIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="m10.5 12 1 1 2-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PricingIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path
        d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M7 9h10M7 15h3M14 15h3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VendorIcon() {
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

const benefits: Benefit[] = [
  {
    title: "AI-Powered Matching",
    description:
      "Tell us about your property and project. Mercurius analyzes the details to match you with the right service and quote.",
    icon: <MatchingIcon />,
  },
  {
    title: "Transparent Pricing",
    description:
      "Compare clear, itemized options without hidden fees, confusing estimates, or uncomfortable price negotiations.",
    icon: <PricingIcon />,
  },
  {
    title: "Trusted Local Vendors",
    description:
      "Connect with qualified professionals who understand Southwest Florida homes, conditions, and service standards.",
    icon: <VendorIcon />,
  },
];

export function HowMercuriusWorks() {
  return (
    <section
      aria-labelledby="how-mercurius-works"
      className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
            Simple by design
          </p>
          <h2
            id="how-mercurius-works"
            className="text-balance text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          >
            How Mercurius works
          </h2>
          <p className="text-pretty text-base leading-7 text-slate-600 sm:text-lg">
            From property details to a trusted professional, we make every step
            of your home service decision clearer.
          </p>
        </header>
        <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {benefits.map((benefit, index) => (
            <li
              key={benefit.title}
              className="group flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none sm:p-8"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  {benefit.icon}
                </span>
                <span
                  aria-hidden="true"
                  className="text-sm font-bold text-slate-300"
                >
                  0{index + 1}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-balance text-xl font-bold text-slate-950">
                  {benefit.title}
                </h3>
                <p className="text-pretty text-sm leading-6 text-slate-600">
                  {benefit.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
