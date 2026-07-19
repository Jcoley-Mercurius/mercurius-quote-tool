"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import { useQuoteHistory } from "@/components/quotes/QuoteHistoryProvider";
import type { Workspace } from "@/lib/organizations/types";
import { workspaceKey, workspaceLabel } from "@/lib/organizations/types";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  toastDismiss,
  toastError,
  toastLoading,
  toastSuccess,
  toastWarning,
} from "@/lib/ui/toast";
import { useVendorProfile } from "@/components/vendor/VendorProfileProvider";
import { MercuriusHero } from "@/components/landing/MercuriusHero";
import { HowMercuriusWorks } from "@/components/landing/HowMercuriusWorks";
import { QuoteForm } from "@/components/quote-form/QuoteForm";
import { QuoteResult } from "@/components/quote-result/QuoteResult";
import type { QuoteFormData } from "@/components/quote-form/types";
import {
  hasVendorSnapshot,
  resolveQuoteVendorProfile,
} from "@/lib/quotes/vendor-snapshot";
import type { QuoteStatus } from "@/lib/quotes/types";
import { encodePhotosForApi, persistQuotePhotos } from "@/lib/quote/photos";
import type {
  GeneratedQuote,
  QuoteFormPayload,
  QuotePhotoInput,
} from "@/lib/quote/types";

function toPayload(form: QuoteFormData): QuoteFormPayload {
  return {
    serviceType: form.serviceType as QuoteFormPayload["serviceType"],
    squareFootage: form.squareFootage,
    stories: form.stories,
    yearBuilt: form.yearBuilt,
    zipCode: form.zipCode,
    jobDescription: form.jobDescription,
    photoCount: form.photos.length,
  };
}

function payloadToFormData(payload: QuoteFormPayload): QuoteFormData {
  return {
    serviceType: payload.serviceType,
    propertyAddress: "",
    squareFootage: payload.squareFootage,
    stories: payload.stories as QuoteFormData["stories"],
    yearBuilt: payload.yearBuilt,
    zipCode: payload.zipCode,
    jobDescription: payload.jobDescription,
    photos: [],
  };
}

function preservePhotoMetadata(
  next: GeneratedQuote,
  previous?: GeneratedQuote
): GeneratedQuote {
  if (!previous) return next;
  return {
    ...next,
    photoAnalysis: next.photoAnalysis ?? previous.photoAnalysis,
    photoThumbnails: next.photoThumbnails ?? previous.photoThumbnails,
  };
}

export function QuoteFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteIdParam = searchParams.get("quoteId");
  const { user } = useAuth();
  const { profile, pricingSettings } = useVendorProfile();
  const { workspace, isLoading: workspaceLoading } = useWorkspace();
  const {
    createAndSave,
    updateQuote,
    getQuote,
    isLoading: quotesLoading,
    loadError: quotesLoadError,
    retryQuotes,
    isRetrying: isRetryingQuotes,
  } = useQuoteHistory();
  const activeWorkspaceKey = workspaceKey(workspace);
  const [saveTargetOverrides, setSaveTargetOverrides] = useState<
    Record<string, Workspace>
  >({});

  const saveTarget = useMemo(
    () => saveTargetOverrides[activeWorkspaceKey] ?? workspace,
    [activeWorkspaceKey, saveTargetOverrides, workspace]
  );

  const setSaveTarget = (next: Workspace) => {
    setSaveTargetOverrides((current) => ({
      ...current,
      [activeWorkspaceKey]: next,
    }));
  };

  const savedQuote = quoteIdParam ? getQuote(quoteIdParam) : undefined;

  const [isGenerating, setIsGenerating] = useState(false);
  // "analyzing" is only set when photos are uploaded; "generating" is always the final step.
  const [genStep, setGenStep] = useState<"analyzing" | "generating">("generating");
  const [genHasPhotos, setGenHasPhotos] = useState(false);
  const [editFormQuoteId, setEditFormQuoteId] = useState<string | null>(null);
  const [isReviseMode, setIsReviseMode] = useState(false);
  const [autoOpenSend, setAutoOpenSend] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [quoteRevision, setQuoteRevision] = useState(0);

  const attachPhotoThumbnails = async (
    quoteId: string,
    quote: GeneratedQuote,
    photos: File[],
    organizationId?: string | null
  ): Promise<GeneratedQuote> => {
    if (photos.length === 0 || !user) return quote;

    try {
      const photoThumbnails = await persistQuotePhotos(
        user.id,
        quoteId,
        photos,
        organizationId
      );
      return { ...quote, photoThumbnails };
    } catch (err) {
      console.error("Photo thumbnail upload failed:", err);
      toastWarning(
        "Quote saved, but photos could not be uploaded. Try editing the quote to add them again."
      );
      return quote;
    }
  };

  const callGenerateApi = async (
    payload: QuoteFormPayload,
    encodedPhotos: QuotePhotoInput[] | undefined,
    options?: {
      regenerate?: boolean;
      existingQuote?: GeneratedQuote;
    }
  ) => {
    const response = await fetch("/api/generate-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form: payload,
        photos: encodedPhotos,
        vendor: pricingSettings,
        regenerate: options?.regenerate,
        existingQuote: options?.existingQuote
          ? {
              lineItems: options.existingQuote.lineItems,
              assumptions: options.existingQuote.assumptions,
              notes: options.existingQuote.notes,
            }
          : undefined,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to generate quote");
    }

    return response.json() as Promise<{
      quote: GeneratedQuote;
      source: "ai" | "fallback";
    }>;
  };

  const handleNewQuoteSubmit = async (formData: QuoteFormData) => {
    const hasPhotos = formData.photos.length > 0;
    setGenHasPhotos(hasPhotos);
    setGenStep(hasPhotos ? "analyzing" : "generating");
    setIsGenerating(true);
    const payload = toPayload(formData);
    const loadingId = toastLoading(
      hasPhotos
        ? "Analyzing photos and generating your quote..."
        : "Generating your quote..."
    );

    try {
      const encodedPhotos = hasPhotos
        ? await encodePhotosForApi(formData.photos)
        : undefined;

      setGenStep("generating");

      const result = await callGenerateApi(payload, encodedPhotos);
      const saved = await createAndSave(
        payload,
        result.quote,
        result.source,
        saveTarget,
        profile
      );
      const quoteWithPhotos = await attachPhotoThumbnails(
        saved.id,
        saved.quote,
        formData.photos,
        saved.organizationId
      );
      if (quoteWithPhotos.photoThumbnails) {
        await updateQuote(saved.id, { quote: quoteWithPhotos });
      }
      toastDismiss(loadingId);
      const savedToCurrentWorkspace =
        (saveTarget.type === "personal" && workspace.type === "personal") ||
        (saveTarget.type === "organization" &&
          workspace.type === "organization" &&
          saveTarget.organizationId === workspace.organizationId);

      if (savedToCurrentWorkspace) {
        toastSuccess("Quote generated and saved.");
        router.replace(`/?quoteId=${saved.id}`);
      } else {
        const targetLabel = workspaceLabel(saveTarget);
        toastSuccess(
          `Quote saved to ${targetLabel}. Switch workspace to view it in History.`
        );
        router.replace("/");
      }
    } catch (err) {
      toastDismiss(loadingId);
      toastError(err, "Could not generate quote. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditQuoteSubmit = async (formData: QuoteFormData) => {
    if (!quoteIdParam || !savedQuote) return;

    const hasPhotos = formData.photos.length > 0;
    setGenHasPhotos(hasPhotos);
    setGenStep(hasPhotos ? "analyzing" : "generating");
    setIsGenerating(true);
    const payload = toPayload(formData);
    const loadingId = toastLoading(
      hasPhotos
        ? "Analyzing photos and regenerating quote..."
        : "Regenerating quote..."
    );

    try {
      const encodedPhotos = hasPhotos
        ? await encodePhotosForApi(formData.photos)
        : undefined;

      setGenStep("generating");

      const result = await callGenerateApi(payload, encodedPhotos, {
        regenerate: true,
        existingQuote: savedQuote.quote,
      });
      let quote = result.quote;
      if (formData.photos.length > 0) {
        quote = await attachPhotoThumbnails(
          quoteIdParam,
          quote,
          formData.photos,
          savedQuote.organizationId
        );
      } else {
        quote = preservePhotoMetadata(quote, savedQuote.quote);
      }
      await updateQuote(quoteIdParam, {
        form: payload,
        quote,
        vendorProfile: profile,
      });
      toastDismiss(loadingId);
      if (isReviseMode) {
        toastSuccess("Quote revised. Now send it to the client.");
        setAutoOpenSend(true);
      } else {
        toastSuccess("Quote updated successfully.");
      }
      setEditFormQuoteId(null);
      setIsReviseMode(false);
      setQuoteRevision((r) => r + 1);
    } catch (err) {
      toastDismiss(loadingId);
      toastError(err, "Could not regenerate quote. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (currentQuote: GeneratedQuote) => {
    if (!savedQuote) return;
    setIsRegenerating(true);
    const loadingId = toastLoading("Regenerating with AI...");

    try {
      const result = await callGenerateApi(savedQuote.form, undefined, {
        regenerate: true,
        existingQuote: currentQuote,
      });
      await updateQuote(savedQuote.id, {
        quote: preservePhotoMetadata(result.quote, savedQuote.quote),
        vendorProfile: profile,
      });
      toastDismiss(loadingId);
      toastSuccess("Quote regenerated successfully.");
      setQuoteRevision((r) => r + 1);
    } catch (err) {
      toastDismiss(loadingId);
      toastError(err, "Regeneration failed. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleQuoteChange = (updatedQuote: GeneratedQuote) => {
    if (savedQuote) {
      void updateQuote(savedQuote.id, { quote: updatedQuote }).catch((err) => {
        toastError(err, "Could not save quote changes.");
      });
    }
  };

  const handleStatusChange = (status: QuoteStatus) => {
    if (savedQuote) {
      void updateQuote(savedQuote.id, { status })
        .then(() => toastSuccess("Quote status updated."))
        .catch((err) => toastError(err, "Could not update quote status."));
    }
  };

  const handleStartOver = () => {
    setEditFormQuoteId(null);
    setIsReviseMode(false);
    setAutoOpenSend(false);
    router.replace("/");
  };

  const handleEditDetails = () => {
    if (quoteIdParam) {
      setIsReviseMode(false);
      setAutoOpenSend(false);
      setEditFormQuoteId(quoteIdParam);
    }
  };

  const handleReviseAndResend = () => {
    if (quoteIdParam) {
      setIsReviseMode(true);
      setAutoOpenSend(false);
      setEditFormQuoteId(quoteIdParam);
    }
  };

  const handleCancelEdit = () => {
    setEditFormQuoteId(null);
    setIsReviseMode(false);
  };

  if (isGenerating) {
    return <GeneratingState step={genStep} hasPhotos={genHasPhotos} />;
  }

  if (workspaceLoading || quotesLoading) {
    return (
      <LoadingState
        message={
          quoteIdParam ? "Loading your quote..." : "Loading workspace..."
        }
      />
    );
  }

  if (quotesLoadError && quoteIdParam) {
    return (
      <ErrorFallback
        title="Could not load this quote"
        message={quotesLoadError}
        onRetry={() => void retryQuotes()}
        retryLabel={isRetryingQuotes ? "Retrying..." : "Try again"}
        showHomeLink
      />
    );
  }

  if (quoteIdParam && !savedQuote) {
    return (
      <QuoteNotFound
        quoteId={quoteIdParam}
        onDismiss={() => router.replace("/")}
      />
    );
  }

  if (savedQuote && editFormQuoteId === quoteIdParam) {
    return (
      <>
        <div className="mx-auto mb-6 max-w-3xl">
          <button
            type="button"
            onClick={handleCancelEdit}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-mercurius-700"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
            Back to quote
          </button>
          {isReviseMode ? (
            <>
              <p className="mt-2 text-sm font-medium text-amber-700">
                Revising{" "}
                <span className="font-semibold">{savedQuote.reference}</span>
                {" — "}addressing the client&apos;s change request.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Update the job details below, then regenerate. You&apos;ll be
                prompted to send the revised quote directly to the client.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Update property details for{" "}
              <span className="font-medium text-slate-700">
                {savedQuote.reference}
              </span>{" "}
              and regenerate with AI.
            </p>
          )}
        </div>
        <QuoteForm
          onSubmit={handleEditQuoteSubmit}
          initialData={payloadToFormData(savedQuote.form)}
          submitLabel={isReviseMode ? "Regenerate & Prepare to Re-Send" : "Regenerate Quote"}
        />
      </>
    );
  }

  if (savedQuote) {
    return (
      <>
        <QuoteResult
          key={`${savedQuote.id}-${quoteRevision}`}
          quote={savedQuote.quote}
          form={savedQuote.form}
          source={savedQuote.source}
          quoteId={savedQuote.id}
          quoteReference={savedQuote.reference}
          createdAt={savedQuote.createdAt}
          status={savedQuote.status}
          vendorProfile={resolveQuoteVendorProfile(savedQuote, profile)}
          usesVendorSnapshot={hasVendorSnapshot(savedQuote)}
          onRegenerate={handleRegenerate}
          onStartOver={handleStartOver}
          onEditDetails={handleEditDetails}
          onQuoteChange={handleQuoteChange}
          onStatusChange={handleStatusChange}
          isRegenerating={isRegenerating}
          onReviseAndResend={
            savedQuote.status === "changes_requested"
              ? handleReviseAndResend
              : undefined
          }
          defaultSendOpen={autoOpenSend}
        />
      </>
    );
  }

  return (
    <>
      {/* Landing hero + benefits shown on the main entry when starting a fresh
          quote. The hero's primary CTA scrolls down to the builder below. */}
      <div className="-mx-4 -mt-8 mb-8 sm:-mx-6 sm:-mt-12">
        <MercuriusHero getQuoteHref="#quote-builder" vendorsHref="/settings" />
        <HowMercuriusWorks />
      </div>
      <div id="quote-builder" className="scroll-mt-24">
        <QuoteForm
          onSubmit={handleNewQuoteSubmit}
          saveTarget={saveTarget}
          onSaveTargetChange={setSaveTarget}
        />
      </div>
    </>
  );
}

function GeneratingState({
  step,
  hasPhotos,
}: {
  step: "analyzing" | "generating";
  hasPhotos: boolean;
}) {
  // Build the ordered step list. The "analyzing" step only appears when photos
  // were uploaded; "generating" is always the final step.
  const steps: { id: "analyzing" | "generating"; label: string; sublabel: string }[] =
    hasPhotos
      ? [
          {
            id: "analyzing",
            label: "Analyzing photos",
            sublabel: "Reading job site conditions and scope…",
          },
          {
            id: "generating",
            label: "Generating quote",
            sublabel: "Building line items and SWFL pricing…",
          },
        ]
      : [
          {
            id: "generating",
            label: "Generating quote",
            sublabel: "Building line items and SWFL pricing…",
          },
        ];

  const currentIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-20 text-center">
      {/* Animated icon */}
      <div className="relative mb-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mercurius-100">
          <svg
            className="h-8 w-8 animate-pulse text-mercurius-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09Z"
            />
          </svg>
        </div>
        <div className="absolute -inset-2 animate-ping rounded-2xl bg-mercurius-200 opacity-20" />
      </div>

      {/* Step list */}
      <ol className="w-full space-y-3 text-left">
        {steps.map((s, index) => {
          const isDone = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <li
              key={s.id}
              className={[
                "flex items-start gap-4 rounded-xl border px-4 py-3.5 transition-all duration-300",
                isActive
                  ? "border-mercurius-200 bg-mercurius-50 shadow-sm"
                  : isDone
                  ? "border-slate-100 bg-white"
                  : "border-slate-100 bg-white opacity-40",
              ].join(" ")}
            >
              {/* Step indicator */}
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {isDone ? (
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 text-mercurius-600"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : isActive ? (
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mercurius-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-mercurius-600" />
                  </span>
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-300" />
                )}
              </span>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p
                  className={[
                    "text-sm font-semibold",
                    isActive ? "text-mercurius-900" : isDone ? "text-slate-700" : "text-slate-400",
                  ].join(" ")}
                >
                  {s.label}
                </p>
                {isActive && (
                  <p className="mt-0.5 text-xs text-mercurius-700/70">
                    {s.sublabel}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Context tags */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {["Property context", "Line items", "Local pricing", "SWFL alerts"].map(
          (label) => (
            <span
              key={label}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500"
            >
              {label}
            </span>
          )
        )}
      </div>
    </div>
  );
}

function QuoteNotFound({
  quoteId,
  onDismiss,
}: {
  quoteId: string;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-900">Quote not found</h2>
      <p className="mt-2 text-sm text-slate-600">
        We couldn&apos;t find a saved quote with ID{" "}
        <span className="font-mono text-xs">{quoteId}</span>. It may have been
        deleted or opened on a different device.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl bg-mercurius-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-mercurius-700"
        >
          Start a New Quote
        </button>
        <Link
          href="/quotes"
          className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          View History
        </Link>
      </div>
    </div>
  );
}

