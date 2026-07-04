import type { QuoteFormData } from "./types";

export type QuoteFormErrors = Partial<Record<keyof QuoteFormData, string>>;

export function validateQuoteForm(data: QuoteFormData): QuoteFormErrors {
  const errors: QuoteFormErrors = {};

  if (!data.serviceType) {
    errors.serviceType = "Select a service type to continue.";
  }

  if (!data.squareFootage || Number(data.squareFootage) < 100) {
    errors.squareFootage = "Enter a valid square footage (min 100 sq ft).";
  }

  if (!data.stories) {
    errors.stories = "Select the number of stories.";
  }

  const year = Number(data.yearBuilt);
  if (!data.yearBuilt || year < 1950 || year > new Date().getFullYear()) {
    errors.yearBuilt = "Enter a valid year built (1950–present).";
  }

  if (!/^\d{5}$/.test(data.zipCode)) {
    errors.zipCode = "Enter a valid 5-digit zip code.";
  }

  if (!data.jobDescription.trim() || data.jobDescription.trim().length < 10) {
    errors.jobDescription = "Describe the job in at least 10 characters.";
  }

  return errors;
}