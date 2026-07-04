import type { QuoteAlert } from "@/lib/quote/types";

const alertStyles: Record<
  QuoteAlert["type"],
  { bg: string; border: string; icon: string; title: string }
> = {
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "text-amber-600",
    title: "text-amber-900",
  },
  suggestion: {
    bg: "bg-mercurius-50",
    border: "border-mercurius-200",
    icon: "text-mercurius-600",
    title: "text-mercurius-900",
  },
  info: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    icon: "text-sky-600",
    title: "text-sky-900",
  },
};

const alertIcons: Record<QuoteAlert["type"], React.ReactNode> = {
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 10 6zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
    </svg>
  ),
  suggestion: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9z" clipRule="evenodd" />
    </svg>
  ),
};

interface QuoteAlertsProps {
  alerts: QuoteAlert[];
}

export function QuoteAlerts({ alerts }: QuoteAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">
        SWFL Insights
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {alerts.map((alert, index) => {
          const style = alertStyles[alert.type];
          return (
            <div
              key={`${alert.title}-${index}`}
              className={`flex gap-3 rounded-xl border p-4 ${style.bg} ${style.border}`}
            >
              <div className={`shrink-0 ${style.icon}`}>
                {alertIcons[alert.type]}
              </div>
              <div>
                <p className={`text-sm font-semibold ${style.title}`}>
                  {alert.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {alert.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}