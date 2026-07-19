"use client";

import { useEffect, useState } from "react";

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  quote: string;
  rating: number;
  serviceType: string;
}

interface TestimonialCarouselProps {
  testimonials?: Testimonial[];
  autoAdvanceMs?: number;
  className?: string;
}

export const sampleTestimonials: Testimonial[] = [
  {
    id: "maria-cape-coral",
    name: "Maria R.",
    location: "Cape Coral, FL",
    quote:
      "Mercurius made comparing pool service quotes incredibly simple. We understood every cost and hired with confidence.",
    rating: 5,
    serviceType: "Pool Service",
  },
  {
    id: "daniel-fort-myers",
    name: "Daniel K.",
    location: "Fort Myers, FL",
    quote:
      "The quote was clear, professional, and easy to review. There were no surprises when the HVAC work was completed.",
    rating: 5,
    serviceType: "HVAC",
  },
  {
    id: "amanda-naples",
    name: "Amanda T.",
    location: "Naples, FL",
    quote:
      "I loved seeing the low, recommended, and premium options side by side. It made choosing our lawn service effortless.",
    rating: 5,
    serviceType: "Lawn Care",
  },
  {
    id: "robert-bonita-springs",
    name: "Robert M.",
    location: "Bonita Springs, FL",
    quote:
      "The presentation felt polished and trustworthy. We approved our plumbing quote the same day.",
    rating: 5,
    serviceType: "Plumbing",
  },
];

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={`size-5 ${direction === "left" ? "rotate-180" : ""}`}
    >
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

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`size-5 ${filled ? "fill-emerald-600 text-emerald-600" : "fill-slate-200 text-slate-200"}`}
    >
      <path
        d="m10 1.8 2.5 5.1 5.6.8-4 4 1 5.5-5.1-2.6-5.1 2.6 1-5.5-4-4 5.6-.8L10 1.8Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TestimonialCarousel({
  testimonials = sampleTestimonials,
  autoAdvanceMs = 6000,
  className = "",
}: TestimonialCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const count = testimonials.length;

  useEffect(() => {
    if (isPaused || count <= 1) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % count);
    }, autoAdvanceMs);
    return () => window.clearInterval(interval);
  }, [autoAdvanceMs, count, isPaused]);

  if (count === 0) return null;
  const activeTestimonial = testimonials[activeIndex % count];

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + count) % count);
  }
  function showNext() {
    setActiveIndex((current) => (current + 1) % count);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Homeowner testimonials"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
      className={`w-full ${className}`}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div
          key={activeTestimonial.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${activeIndex + 1} of ${count}`}
          className="flex min-h-80 animate-[fadeIn_350ms_ease-out] flex-col justify-between gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                {activeTestimonial.serviceType}
              </span>
              <div
                className="flex items-center gap-1"
                aria-label={`${activeTestimonial.rating} out of 5 stars`}
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <StarIcon
                    key={index}
                    filled={index < activeTestimonial.rating}
                  />
                ))}
              </div>
            </div>
            <blockquote className="text-pretty text-xl font-semibold leading-relaxed text-slate-950 sm:text-2xl">
              &ldquo;{activeTestimonial.quote}&rdquo;
            </blockquote>
          </div>
          <footer className="flex items-center gap-4 border-t border-slate-100 pt-6">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white"
            >
              {activeTestimonial.name.charAt(0)}
            </span>
            <div>
              <cite className="not-italic font-semibold text-slate-950">
                {activeTestimonial.name}
              </cite>
              <p className="text-sm leading-6 text-slate-500">
                {activeTestimonial.location}
              </p>
            </div>
          </footer>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-2"
            role="group"
            aria-label="Choose testimonial"
          >
            {testimonials.map((testimonial, index) => (
              <button
                key={testimonial.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show testimonial ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={[
                  "h-2.5 rounded-full transition-all duration-300",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
                  index === activeIndex
                    ? "w-8 bg-emerald-600"
                    : "w-2.5 bg-slate-300 hover:bg-emerald-300",
                ].join(" ")}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Previous testimonial"
              className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-600 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Next testimonial"
              className="flex size-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
