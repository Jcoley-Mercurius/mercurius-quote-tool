"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  deleteOrganizationLogo,
  deleteVendorLogo,
  uploadOrganizationLogo,
  uploadVendorLogo,
} from "@/lib/supabase/logo-storage";
import type { Workspace } from "@/lib/organizations/types";
import { toastError } from "@/lib/ui/toast";
import { getVendorLogoSrc } from "@/lib/vendor/logo";

const MAX_SIZE_MB = 2;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

interface LogoUploadProps {
  workspaceScope: Workspace;
  logoUrl: string | null;
  legacyLogoDataUrl?: string | null;
  onChange: (logoUrl: string | null) => void;
  onLegacyClear?: () => void;
}

export function LogoUpload({
  workspaceScope,
  logoUrl,
  legacyLogoDataUrl = null,
  onChange,
  onLegacyClear,
}: LogoUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const previewSrc = getVendorLogoSrc({
    logoUrl,
    logoDataUrl: legacyLogoDataUrl,
  });

  const isBusy = isUploading || isRemoving;

  const handleFile = async (file: File) => {
    if (!user) {
      toastError(null, "Sign in to upload a logo.");
      return;
    }

    if (!ACCEPTED.includes(file.type)) {
      toastError(null, "Please upload a JPG, PNG, WebP, or SVG image.");
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toastError(null, `Logo must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    setIsUploading(true);
    try {
      const publicUrl =
        workspaceScope.type === "organization"
          ? await uploadOrganizationLogo(workspaceScope.organizationId, file)
          : await uploadVendorLogo(user.id, file);
      onChange(publicUrl);
      onLegacyClear?.();
    } catch (err) {
      toastError(err, "Failed to upload logo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) {
      onChange(null);
      onLegacyClear?.();
      return;
    }

    setIsRemoving(true);
    try {
      if (workspaceScope.type === "organization") {
        await deleteOrganizationLogo(workspaceScope.organizationId);
      } else {
        await deleteVendorLogo(user.id);
      }
      onChange(null);
      onLegacyClear?.();
    } catch (err) {
      toastError(err, "Failed to remove logo. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div>
      <div className="flex items-start gap-5">
        <div
          onClick={() => !isBusy && inputRef.current?.click()}
          className={[
            "relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-slate-50 transition-colors",
            isBusy
              ? "cursor-wait border-mercurius-200"
              : "cursor-pointer border-slate-200 hover:border-mercurius-400 hover:bg-mercurius-50/30",
          ].join(" ")}
        >
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt="Your logo"
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <div className="text-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto h-6 w-6 text-slate-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                />
              </svg>
              <span className="mt-1 block text-[10px] text-slate-400">Upload</span>
            </div>
          )}

          {isBusy && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <svg
                className="h-6 w-6 animate-spin text-mercurius-600"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">Company logo</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Stored securely in Supabase Storage. Appears on PDF exports.
            Recommended: square or horizontal logo on transparent background. Max{" "}
            {MAX_SIZE_MB}MB.
          </p>
          {legacyLogoDataUrl && !logoUrl && (
            <p className="mt-2 text-xs text-amber-700">
              Using a legacy saved logo. Upload a new file to migrate to cloud
              storage.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading
                ? "Uploading..."
                : previewSrc
                  ? "Replace logo"
                  : "Choose file"}
            </button>
            {previewSrc && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleRemove()}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRemoving ? "Removing..." : "Remove"}
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        disabled={isBusy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}