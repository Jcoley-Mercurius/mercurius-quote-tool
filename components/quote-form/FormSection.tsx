interface FormSectionProps {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormSection({
  step,
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mercurius-50 text-sm font-semibold text-mercurius-700 ring-1 ring-mercurius-100">
          {step}
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}