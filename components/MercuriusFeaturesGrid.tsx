import type { ReactNode } from "react"

interface Feature {
  title: string
  description: string
  eyebrow: string
  icon: ReactNode
  wide?: boolean
}

function SparklesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path d="m12 3 .8 2.2A5 5 0 0 0 15.8 8l2.2.8-2.2.8a5 5 0 0 0-3 3L12 15l-.8-2.4a5 5 0 0 0-3-3L6 8.8 8.2 8a5 5 0 0 0 3-2.8L12 3Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="m19 14 .4 1.1a3 3 0 0 0 1.5 1.5l1.1.4-1.1.4a3 3 0 0 0-1.5 1.5L19 20l-.4-1.1a3 3 0 0 0-1.5-1.5L16 17l1.1-.4a3 3 0 0 0 1.5-1.5L19 14Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="m4 17 4.5-4 3 3 2.5-2 6 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function ClientIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 9h18m-7 6 2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M14 17.5h7M17.5 14v7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

const features: Feature[] = [
  {
    eyebrow: "Create",
    title: "AI Quote Generation",
    description: "Turn project details into polished, itemized quotes in minutes—with labor, materials, and local market factors already considered.",
    icon: <SparklesIcon />,
    wide: true,
  },
  {
    eyebrow: "Visualize",
    title: "Reimagine Visualization",
    description: "Help homeowners picture the finished project with clear, compelling AI-assisted visual concepts.",
    icon: <ImageIcon />,
  },
  {
    eyebrow: "Compare",
    title: "Transparent Pricing",
    description: "Present easy-to-understand options so clients can compare scope, materials, and total investment with confidence.",
    icon: <ReceiptIcon />,
  },
  {
    eyebrow: "Convert",
    title: "Client Portal & Acceptance",
    description: "Deliver quotes through a professional client experience with simple review, selection, and digital acceptance.",
    icon: <ClientIcon />,
  },
  {
    eyebrow: "Local insight",
    title: "Local SWFL Expertise",
    description: "Build estimates informed by Southwest Florida housing, weather, permit, and regional pricing considerations.",
    icon: <PinIcon />,
  },
  {
    eyebrow: "Manage",
    title: "Vendor Dashboard",
    description: "Track active quotes, client decisions, and opportunities from one focused workspace built for service professionals.",
    icon: <DashboardIcon />,
    wide: true,
  },
]

export function MercuriusFeaturesGrid() {
  return (
    <section aria-labelledby="mercurius-features-title" className="bg-feature-surface px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="flex max-w-3xl flex-col gap-4">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-500">Built for better quoting</p>
          <h2 id="mercurius-features-title" className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Everything you need to quote, present, and win the work.
          </h2>
          <p className="max-w-2xl text-pretty text-base leading-7 text-slate-300 sm:text-lg">
            Mercurius brings intelligent estimating and a polished homeowner experience into one streamlined platform.
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className={`group flex min-h-72 flex-col justify-between gap-8 overflow-hidden rounded-2xl border border-slate-800 bg-feature-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-600 hover:shadow-xl hover:shadow-emerald-950/20 motion-reduce:transform-none motion-reduce:transition-none sm:p-7 ${feature.wide ? "lg:col-span-2" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl border border-emerald-900 bg-emerald-950 text-emerald-500 transition-colors group-hover:border-emerald-600 group-hover:bg-emerald-600 group-hover:text-white">
                  {feature.icon}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{feature.eyebrow}</span>
              </div>

              <div className="flex max-w-xl flex-col gap-3">
                <h3 className="text-balance text-xl font-bold text-white sm:text-2xl">{feature.title}</h3>
                <p className="text-pretty text-sm leading-6 text-slate-400">{feature.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
