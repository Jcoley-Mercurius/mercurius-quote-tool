import { toastError } from "@/lib/ui/toast";

/** Surface the first validation error (and a count) as a toast. */
export function toastValidationErrors(
  errors: Record<string, string | undefined>
): void {
  const messages = Object.values(errors).filter(Boolean) as string[];
  if (messages.length === 0) return;

  if (messages.length === 1) {
    toastError(null, messages[0]);
    return;
  }

  toastError(
    null,
    `Please fix ${messages.length} issues. ${messages[0]}`
  );
}