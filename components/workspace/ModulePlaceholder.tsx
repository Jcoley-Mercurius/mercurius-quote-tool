import Link from "next/link";

export function ModulePlaceholder({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <section className="mx-auto max-w-3xl py-8 sm:py-14" aria-labelledby="module-title">
      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200">
        Coming soon
      </span>
      <h1 id="module-title" className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        {name}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>
      <div className="mt-8">
        <Link
          href="/command-center"
          className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white outline-none transition hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Back to Business Command Center
        </Link>
      </div>
    </section>
  );
}
