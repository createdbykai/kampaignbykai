"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { CampaignAsset } from "@/lib/types";

export function BlobPreview({
  blob,
  label,
  className = "",
}: {
  blob: Blob;
  label: string;
  className?: string;
}) {
  const [preview, setPreview] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreview(reader.result);
    };
    reader.readAsDataURL(blob);
    return () => reader.abort();
  }, [blob]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  return (
    <>
      <button
        aria-label={`Open ${label} full screen`}
        className={`generated-asset-preview${preview ? "" : " preview-loading"} ${className}`}
        disabled={!preview}
        onClick={() => setIsFullscreen(true)}
        style={preview ? { backgroundImage: `url("${preview}")` } : undefined}
        type="button"
      >
        {!preview && "Loading image…"}
      </button>
      {isFullscreen && preview && (
        <div
          aria-label={label}
          aria-modal="true"
          className="image-lightbox"
          onClick={() => setIsFullscreen(false)}
          role="dialog"
        >
          <div className="image-lightbox-backdrop" />
          <button
            aria-label="Close full-screen image"
            autoFocus
            className="image-lightbox-close"
            onClick={() => setIsFullscreen(false)}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
          <img
            alt={label}
            aria-label={label}
            className="image-lightbox-image"
            onClick={(event) => event.stopPropagation()}
            src={preview}
          />
        </div>
      )}
    </>
  );
}

export function AssetPreview({
  asset,
  label,
  className = "",
}: {
  asset: CampaignAsset;
  label: string;
  className?: string;
}) {
  return <BlobPreview blob={asset.blob} className={className} label={label} />;
}
