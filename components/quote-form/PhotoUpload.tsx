"use client";

import { useCallback, useRef, useState } from "react";

const MAX_PHOTOS = 8;
const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

interface PhotoUploadProps {
  photos: File[];
  onChange: (photos: File[]) => void;
}

interface PhotoPreview {
  file: File;
  url: string;
}

export function PhotoUpload({ photos, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previews: PhotoPreview[] = photos.map((file) => ({
    file,
    url: URL.createObjectURL(file),
  }));

  const addPhotos = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      setIsProcessing(true);

      try {
        const incoming = Array.from(files);
        const valid: File[] = [];
        let validationError: string | null = null;

        for (const file of incoming) {
          if (!ACCEPTED_TYPES.includes(file.type)) {
            validationError = "Please upload JPG, PNG, or WebP images only.";
            continue;
          }
          if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            validationError = `Each photo must be under ${MAX_FILE_SIZE_MB}MB.`;
            continue;
          }
          valid.push(file);
        }

        const combined = [...photos, ...valid].slice(0, MAX_PHOTOS);
        if (photos.length + valid.length > MAX_PHOTOS) {
          validationError = `Maximum ${MAX_PHOTOS} photos allowed.`;
        }

        if (validationError) {
          setError(validationError);
        }

        if (valid.length > 0) {
          onChange(combined);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [photos, onChange]
  );

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addPhotos(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={[
          "relative rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all",
          isProcessing
            ? "cursor-wait border-mercurius-300 bg-mercurius-50/50"
            : "cursor-pointer",
          isDragging
            ? "border-mercurius-500 bg-mercurius-50"
            : "border-slate-200 bg-slate-50/50 hover:border-mercurius-400 hover:bg-mercurius-50/30",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mercurius-100 text-mercurius-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700">
          {isProcessing ? (
            "Processing photos..."
          ) : (
            <>
              Drop photos here or{" "}
              <span className="text-mercurius-600">browse files</span>
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Up to {MAX_PHOTOS} photos · JPG, PNG, WebP · {MAX_FILE_SIZE_MB}MB max each
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Photos of damage, equipment labels, or job site help us quote faster
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {previews.length > 0 && (
        <div className="photo-scroll flex gap-3 overflow-x-auto pb-2">
          {previews.map((preview, index) => (
            <div
              key={`${preview.file.name}-${index}`}
              className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={`Upload preview ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removePhoto(index);
                }}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`Remove photo ${index + 1}`}
              >
                <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3">
                  <path d="M3.5 3.5 8.5 8.5M8.5 3.5 3.5 8.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-mercurius-400 hover:text-mercurius-600"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="mt-1 text-[10px] font-medium">Add more</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}