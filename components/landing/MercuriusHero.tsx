import Image from "next/image";
import Link from "next/link";

interface MercuriusHeroProps {
  imageSrc?: string;
  getQuoteHref?: string;
  vendorsHref?: string;
}

const trustStats = [
  { value: "2,400+", label: "Trusted vendors" },
  { value: "18,000+", label: "Quotes generated" },
  { value: "4.9/5", label: "Homeowner rating" },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-5">
      <path
        d="M4 10h12m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
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

export function MercuriusHero({
  imageSrc = "/images/swfl-home.jpg",
  getQuoteHref = "/quote",
  vendorsHref = "/vendors",
}: MercuriusHeroProps) {
  return (
    <section className="overflow-hidden bg-emerald-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center gap-8 p-6 sm:p-10 lg:p-14">
            <div className="flex flex-col gap-6">
              <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                <ShieldIcon />
                Smarter home service decisions
              </div>
              <div className="flex flex-col gap-5">
                <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[1.05]">
                  Smart quotes. Trusted vendors.{" "}
                  <span className="text-emerald-600">Your home, protected.</span>
                </h1>
                <p className="max-w-xl text-pretty text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  AI-powered home service quotes matched to your property — no
                  haggling, no guesswork.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={getQuoteHref}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  Get a Quote
                  <ArrowIcon />
                </Link>
                <Link
                  href={vendorsHref}
                  className="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:border-emerald-600 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  For Vendors
                </Link>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-6">
              {trustStats.map((stat) => (
                <div key={stat.label} className="flex min-w-0 flex-col gap-1">
                  <dt className="order-2 text-xs leading-5 text-slate-500 sm:text-sm">
                    {stat.label}
                  </dt>
                  <dd className="order-1 text-lg font-bold tracking-tight text-slate-950 sm:text-2xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative min-h-80 overflow-hidden bg-slate-100 sm:min-h-112 lg:min-h-160">
            <Image
              src={imageSrc}
              alt="Modern Southwest Florida home surrounded by palm trees"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-lg backdrop-blur sm:inset-x-6 sm:bottom-6">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <ShieldIcon />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">
                    Property-matched pricing
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    Built around your home and local SWFL rates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
