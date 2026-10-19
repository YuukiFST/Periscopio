import { ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const photoSizes = {
  row: { frame: "size-8 rounded-md sm:size-10", icon: "size-4", pixels: 40 },
  compare: { frame: "size-12 rounded-lg sm:size-16", icon: "size-5", pixels: 64 },
  detail: { frame: "size-24 rounded-xl sm:size-40", icon: "size-6", pixels: 160 },
} as const;

type ProductPhotoProps = {
  src: string | null;
  /** Empty for a decorative photo next to the Produto's name. */
  alt: string;
  size: keyof typeof photoSizes;
  loading?: "lazy" | "eager";
};

/**
 * Keeps the photo's space when there is no photo, or when it fails to load:
 * offline, a photo never seen before is not in the cache.
 * Give it `key={src}` so a new photo gets a fresh attempt.
 */
export function ProductPhoto({ src, alt, size, loading = "eager" }: ProductPhotoProps) {
  const [failed, setFailed] = useState(false);
  const { frame, icon, pixels } = photoSizes[size];
  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className={cn(frame, "grid shrink-0 place-items-center bg-component text-fg-tertiary")}
      >
        <ImageOff className={icon} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={pixels}
      height={pixels}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(
        frame,
        "shrink-0 bg-white object-contain outline-1 -outline-offset-1 outline-border",
      )}
    />
  );
}
