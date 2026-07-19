import type { ReactNode } from "react";

interface Benefit {
  title: string;
  description: string;
  supportingText: string;
  icon: ReactNode;
}

function QuoteGenerationIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path
        d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v5h5M9 13h6M9 17h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m18.5 11 .45 1.05L20 12.5l-1.05.45L18.5 14l-.45-1.05L17 12.5l1.05-.45L18.5 11Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TransparentPricingIcon() {
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

function DeliveryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path
        d="M5 3h10a2 2 0 0 1 2 2v5M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 8h6M7 12h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="17" cy="16" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="m15.5 16 1 1 2-2"
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
    title: "Submit a Repair Request",
    description:
      "Homeowners describe the problem and property details. AI structures it into a clear, actionable job scope in seconds.",
    supportingText: "No jargon. No guesswork. Just the fix you need.",
    icon: <QuoteGenerationIcon />,
  },
  {
    title: "AI-Matched to Trusted Vendors",
    description:
      "We route each request to the right local pros, who receive warm, ready-to-quote leads — never cold contact lists.",
    supportingText: "Warm repair leads that actually convert.",
    icon: <DeliveryIcon />,
  },
  {
    title: "Compare Quotes & Get It Fixed",
    description:
      "Homeowners compare clear, itemized quotes and accept in a click. Vendors win the work and get straight to the job.",
    supportingText: "From request to repaired, all in one place.",
    icon: <TransparentPricingIcon />,
  },
];

export function HowMercuriusWorks() {
  return (
    <section
      aria-labelledby="how-mercurius-works"
      className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
            How it works
          </p>
          <h2
            id="how-mercurius-works"
            className="text-balance text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          >
            From repair request to work won — in one flow.
          </h2>
          <p className="max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg">
            Homeowners describe the problem, AI matches it to trusted local
            vendors, and quotes come back fast. Warm leads for pros, clear
            choices for homeowners.
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
              <div className="flex flex-1 flex-col gap-3">
                <h3 className="text-balance text-xl font-bold text-slate-950">
                  {benefit.title}
                </h3>
                <p className="text-pretty text-sm leading-6 text-slate-600">
                  {benefit.description}
                </p>
                <p className="mt-auto border-t border-slate-100 pt-4 text-sm font-semibold leading-6 text-emerald-700">
                  {benefit.supportingText}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
