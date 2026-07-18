import type { ReactNode } from "react";

export interface QuoteOption {
  id: string;
  name: string;
  description: string;
  services: string[];
  laborRate: string;
  materials: string;
  totalPrice: string;
  recommended?: boolean;
}

interface QuoteComparisonProps {
  options?: QuoteOption[];
  className?: string;
  onSelect?: (option: QuoteOption) => void;
}

const sampleOptions: QuoteOption[] = [
  {
    id: "essential",
    name: "Essential",
    description:
      "Core scope to get the job done reliably with dependable, builder-grade materials.",
    services: [
      "Standard labor & installation",
      "Builder-grade materials",
      "Basic haul-away & cleanup",
      "1-year workmanship warranty",
    ],
    laborRate: "$85/hr",
    materials: "$1,200",
    totalPrice: "$4,850",
  },
  {
    id: "recommended",
    name: "Recommended",
    description:
      "Our best-value package, balancing quality, durability, and price for this job.",
    services: [
      "Experienced crew labor",
      "Mid-grade premium materials",
      "Full haul-away & cleanup",
      "3-year workmanship warranty",
      "Priority scheduling",
    ],
    laborRate: "$110/hr",
    materials: "$2,100",
    totalPrice: "$6,400",
    recommended: true,
  },
  {
    id: "premium",
    name: "Premium",
    description:
      "Top-tier materials and finish for a long-lasting, standout result.",
    services: [
      "Senior specialist labor",
      "Top-grade materials & fixtures",
      "White-glove cleanup",
      "5-year workmanship warranty",
      "Priority scheduling",
      "Extended manufacturer warranties",
    ],
    laborRate: "$140/hr",
    materials: "$3,600",
    totalPrice: "$9,250",
  },
];

function Checkmark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600"
    >
      ✓
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-200 py-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-slate-950">
        {children}
      </dd>
    </div>
  );
}

function QuoteCard({
  option,
  onSelect,
}: {
  option: QuoteOption;
  onSelect?: (option: QuoteOption) => void;
}) {
  const recommended = option.recommended;
  return (
    <article
      className={[
        "relative flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg",
        recommended
          ? "border-2 border-emerald-600 shadow-md shadow-emerald-600/10"
          : "border border-slate-200",
      ].join(" ")}
    >
      {recommended && (
        <span className="absolute right-5 top-0 -translate-y-1/2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
          Best Value
        </span>
      )}
      <header className="flex flex-col gap-2">
        <p
          className={[
            "text-sm font-bold uppercase tracking-widest",
            recommended ? "text-emerald-600" : "text-slate-500",
          ].join(" ")}
        >
          {option.name}
        </p>
        <p className="min-h-12 text-sm leading-6 text-slate-600">
          {option.description}
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-6 pt-6">
        <section aria-label={`${option.name} included services`}>
          <h3 className="text-sm font-semibold text-slate-950">
            Included services
          </h3>
          <ul className="flex flex-col gap-3 pt-4">
            {option.services.map((service) => (
              <li
                key={service}
                className="flex items-start gap-3 text-sm leading-6 text-slate-600"
              >
                <Checkmark />
                <span>{service}</span>
              </li>
            ))}
          </ul>
        </section>
        <dl className="mt-auto">
          <DetailRow label="Labor rate">{option.laborRate}</DetailRow>
          <DetailRow label="Materials">{option.materials}</DetailRow>
        </dl>
        <div
          className={[
            "rounded-xl p-5",
            recommended ? "bg-emerald-600 text-white" : "bg-slate-100",
          ].join(" ")}
        >
          <p
            className={[
              "text-sm font-medium",
              recommended ? "text-emerald-50" : "text-slate-500",
            ].join(" ")}
          >
            Total price
          </p>
          <p
            className={[
              "pt-1 text-3xl font-bold tracking-tight",
              recommended ? "text-white" : "text-slate-950",
            ].join(" ")}
          >
            {option.totalPrice}
          </p>
        </div>
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(option)}
            className={[
              "min-h-11 w-full rounded-xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
              recommended
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-slate-300 bg-white text-slate-950 hover:border-emerald-600 hover:text-emerald-600",
            ].join(" ")}
          >
            Select {option.name}
          </button>
        )}
      </div>
    </article>
  );
}

export function QuoteComparison({
  options = sampleOptions,
  className = "",
  onSelect,
}: QuoteComparisonProps) {
  return (
    <section
      aria-labelledby="quote-comparison-title"
      className={`w-full ${className}`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex max-w-2xl flex-col gap-3">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
            Mercurius Quote Tool
          </p>
          <h2
            id="quote-comparison-title"
            className="text-balance text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          >
            Compare your quote options
          </h2>
          <p className="text-pretty text-base leading-7 text-slate-600">
            Review the scope and pricing of each option to find the right fit
            for your project.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
          {options.map((option) => (
            <QuoteCard key={option.id} option={option} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </section>
  );
}
