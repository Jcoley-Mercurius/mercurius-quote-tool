"use client";

import { useState } from "react";
import { PhotoViewerModal } from "@/components/photos/PhotoViewerModal";
import { DownloadQuotePhotosButton } from "@/components/photos/DownloadQuotePhotosButton";
import {
  confidenceLevel,
  getPhotoForObservation,
  hasLowConfidenceObservations,
  normalizePhotoVisionAnalysis,
  observationText,
  scopeItemText,
} from "@/lib/quote/vision-compat";
import type {
  PhotoVisionAnalysis,
  PhotoVisionObservation,
  PhotoVisionScopeItem,
} from "@/lib/quote/vision-schema";
import type { QuotePhotoThumbnail } from "@/lib/quote/types";

interface PhotoVisionSummaryProps {
  analysis: PhotoVisionAnalysis;
  thumbnails?: QuotePhotoThumbnail[];
  quoteId?: string;
  quoteReference?: string;
}

function ConfidenceBadge({ score }: { score: number }) {
  const level = confidenceLevel(score);
  const styles = {
    high: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    medium: "bg-amber-50 text-amber-700 ring-amber-200",
    low: "bg-red-50 text-red-700 ring-red-200",
  }[level];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${styles}`}
      title={`AI confidence: ${score}%`}
    >
      {score}%
    </span>
  );
}

function PhotoLinkButton({
  photo,
  onPhotoClick,
}: {
  photo: QuotePhotoThumbnail;
  onPhotoClick: (photo: QuotePhotoThumbnail) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPhotoClick(photo)}
      className="shrink-0 overflow-hidden rounded-md ring-1 ring-slate-200 transition hover:ring-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
      title={`View photo ${photo.index + 1}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbnailUrl}
        alt={`Photo ${photo.index + 1}`}
        className="h-10 w-10 object-cover"
      />
    </button>
  );
}

function ObservationRow({
  observation,
  thumbnails,
  onPhotoClick,
}: {
  observation: PhotoVisionObservation;
  thumbnails?: QuotePhotoThumbnail[];
  onPhotoClick: (photo: QuotePhotoThumbnail) => void;
}) {
  const linkedPhoto = getPhotoForObservation(thumbnails, observation.photoIndex);

  return (
    <li className="flex items-start gap-3 text-sm text-slate-700">
      {linkedPhoto ? (
        <PhotoLinkButton photo={linkedPhoto} onPhotoClick={onPhotoClick} />
      ) : null}
      <span className="min-w-0 flex-1 pt-0.5">{observationText(observation)}</span>
      <ConfidenceBadge score={observation.confidence} />
    </li>
  );
}

function ScopeItemRow({
  item,
  thumbnails,
  onPhotoClick,
}: {
  item: PhotoVisionScopeItem;
  thumbnails?: QuotePhotoThumbnail[];
  onPhotoClick: (photo: QuotePhotoThumbnail) => void;
}) {
  const linkedPhoto = getPhotoForObservation(thumbnails, item.photoIndex);

  return (
    <li className="flex items-start gap-3 text-sm text-slate-700">
      {linkedPhoto ? (
        <PhotoLinkButton photo={linkedPhoto} onPhotoClick={onPhotoClick} />
      ) : (
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
      )}
      <span className="min-w-0 flex-1 pt-0.5">{scopeItemText(item)}</span>
    </li>
  );
}

export function PhotoVisionSummary({
  analysis: rawAnalysis,
  thumbnails,
  quoteId,
  quoteReference,
}: PhotoVisionSummaryProps) {
  const analysis = normalizePhotoVisionAnalysis(rawAnalysis);
  const [activePhoto, setActivePhoto] = useState<QuotePhotoThumbnail | null>(
    null
  );

  if (!analysis) return null;

  const showReviewWarning = hasLowConfidenceObservations(analysis);
  const photoCount = thumbnails?.length ?? 0;

  return (
    <>
      <section className="rounded-2xl border border-sky-200/80 bg-sky-50/60 p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Photo analysis</h2>
            <p className="mt-1 text-sm text-slate-600">
              What the AI observed in your uploaded photos before generating this
              quote. Click a thumbnail to view the full-size image.
            </p>
          </div>
          {photoCount > 0 && quoteId && quoteReference ? (
            <DownloadQuotePhotosButton
              quoteId={quoteId}
              quoteReference={quoteReference}
              photoCount={photoCount}
            />
          ) : null}
        </div>

        {photoCount > 0 ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {thumbnails!.map((photo) => (
              <button
                key={photo.thumbnailUrl}
                type="button"
                onClick={() => setActivePhoto(photo)}
                className="block overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
                title={photo.originalName ?? `Photo ${photo.index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.originalName ?? `Job photo ${photo.index + 1}`}
                  className="h-20 w-20 object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}

        {showReviewWarning ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Review recommended.</span> Some
            observations have lower confidence — verify on site before quoting.
          </div>
        ) : null}

        <p className="text-sm leading-relaxed text-slate-700">{analysis.summary}</p>

        {analysis.visibleIssues.length > 0 ? (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-slate-900">Visible issues</h3>
            <ul className="mt-2 space-y-2">
              {analysis.visibleIssues.map((issue) => (
                <ObservationRow
                  key={`${issue.text}-${issue.photoIndex ?? "none"}`}
                  observation={issue}
                  thumbnails={thumbnails}
                  onPhotoClick={setActivePhoto}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {analysis.equipmentIdentified.length > 0 ? (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Equipment identified
            </h3>
            <ul className="mt-2 space-y-2">
              {analysis.equipmentIdentified.map((item) => (
                <ObservationRow
                  key={`${item.text}-${item.photoIndex ?? "none"}`}
                  observation={item}
                  thumbnails={thumbnails}
                  onPhotoClick={setActivePhoto}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {analysis.suggestedScope.length > 0 ? (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-slate-900">Suggested scope</h3>
            <ul className="mt-2 space-y-2">
              {analysis.suggestedScope.map((item) => (
                <ScopeItemRow
                  key={`${item.text}-${item.photoIndex ?? "none"}`}
                  item={item}
                  thumbnails={thumbnails}
                  onPhotoClick={setActivePhoto}
                />
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <PhotoViewerModal
        open={activePhoto !== null}
        onClose={() => setActivePhoto(null)}
        thumbnailUrl={activePhoto?.thumbnailUrl ?? ""}
        originalPath={activePhoto?.originalPath}
        title={activePhoto?.originalName ?? "Job photo"}
      />
    </>
  );
}