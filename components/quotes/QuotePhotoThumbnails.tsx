import type { QuotePhotoThumbnail } from "@/lib/quote/types";

interface QuotePhotoThumbnailsProps {
  thumbnails: QuotePhotoThumbnail[];
  size?: "sm" | "md";
}

export function QuotePhotoThumbnails({
  thumbnails,
  size = "sm",
}: QuotePhotoThumbnailsProps) {
  if (thumbnails.length === 0) return null;

  const dimension = size === "sm" ? "h-12 w-12" : "h-16 w-16";
  const visible = thumbnails.slice(0, 4);
  const overflow = thumbnails.length - visible.length;

  return (
    <div className="flex items-center gap-1.5">
      {visible.map((photo) => (
        <div
          key={photo.thumbnailUrl}
          className={`${dimension} overflow-hidden rounded-md ring-1 ring-slate-200`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.thumbnailUrl}
            alt={photo.originalName ?? `Photo ${photo.index + 1}`}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
      {overflow > 0 ? (
        <span className="text-xs font-medium text-slate-400">+{overflow}</span>
      ) : null}
    </div>
  );
}