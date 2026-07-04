import { toast as sonner } from "sonner";
import { friendlyError } from "@/lib/errors/messages";

export function toastSuccess(message: string): void {
  sonner.success(message);
}

export function toastError(error: unknown, fallback: string): void {
  sonner.error(friendlyError(error, fallback));
}

export function toastInfo(
  message: string,
  options?: { duration?: number }
): void {
  sonner.info(message, { duration: options?.duration ?? 4000 });
}

export function toastWarning(
  message: string,
  options?: { duration?: number }
): void {
  sonner.warning(message, { duration: options?.duration ?? 5000 });
}

/** Subtle confirmation for autosaved edits (short duration). */
export function toastSaved(message = "Changes saved."): void {
  sonner.success(message, { duration: 2000 });
}

export function toastLoading(message: string): string | number {
  return sonner.loading(message);
}

export function toastDismiss(id?: string | number): void {
  sonner.dismiss(id);
}

export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> {
  const toastId = sonner.loading(messages.loading);
  try {
    const result = await promise;
    sonner.success(messages.success, { id: toastId });
    return result;
  } catch (err) {
    sonner.error(friendlyError(err, messages.error), { id: toastId });
    throw err;
  }
}