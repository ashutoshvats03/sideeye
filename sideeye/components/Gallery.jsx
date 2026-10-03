"use client";

import Image from "next/image";
import { primaryImage } from "../lib/images.js";
import { useState } from "react";

/**
 * Product image gallery.
 *
 * Most SideEye pieces ship a single photo, so the single-image path is the common one and
 * must not look like a gallery with a missing part: no thumbnail strip, no arrows.
 *
 * Every frame is declared at the same 1:1 ratio and rendered in an `aspect-square box with
 * `object-cover`, so the reserved box always equals the laid-out box and the page cannot
 * shift while images stream in (plan constraint: no CLS).
 */
export default function Gallery({ images = [], alt = "" }) {
  const [index, setIndex] = useState(0);

  // A product's images can change between renders (admin edit). Clamp rather than trust
  // the previous index, or the main frame renders an undefined src.
  const safeIndex = Math.min(index, Math.max(images.length - 1, 0));
  // A product with no photos yet shows the brand fallback instead of an empty
  // frame — Gallery must never hand next/image an undefined src.
  const current = images[safeIndex] ?? primaryImage(images);

  const multiple = images.length > 1;

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
      <div
        className="relative aspect-square w-full overflow-hidden rounded-3xl bg-surface ring-1 ring-neutral-200"
        aria-roledescription={multiple ? "gallery" : undefined}
        aria-label={multiple ? `${alt} image gallery` : undefined}
      >
        <Image
          key={current}
          src={current}
          alt={multiple ? `${alt} — photo ${safeIndex + 1} of ${images.length}` : alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          // The first frame is the page's LCP candidate.
          preload={safeIndex === 0}
        />
      </div>

      {multiple ? (
        <ul
          className="flex shrink-0 gap-3 sm:w-20 sm:flex-col"
          aria-label="Choose a photo"
        >
          {images.map((src, i) => {
            const selected = i === safeIndex;
            return (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={selected ? "true" : undefined}
                  aria-label={`Show photo ${i + 1} of ${images.length}`}
                  className={`block h-16 w-16 overflow-hidden rounded-2xl ring-2 transition sm:h-20 sm:w-20 ${
                    selected
                      ? "ring-brand"
                      : "ring-neutral-200 hover:ring-neutral-400"
                  } focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red`}
                >
                  <Image
                    src={src}
                    alt=""
                    width={160}
                    height={160}
                    sizes="80px"
                    className="h-full w-full object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}