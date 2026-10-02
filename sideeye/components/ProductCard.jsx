import Image from "next/image";
import Link from "next/link";
import { formatPaise } from "../lib/money.js";

/**
 * One product in a grid or rail.
 *
 * Server-renderable (no hooks, no "use client") so it can be dropped into any server
 * page without shipping JavaScript for it.
 *
 * No-CLS contract: product photos are a mix of portrait and landscape originals, so the
 * image is pinned to an explicit square box via a declared 1:1 size plus `aspect-square`
 * and `object-cover`. The reserved box is therefore exactly the rendered box regardless of
 * the source image's intrinsic ratio.
 */
export default function ProductCard({
  product,
  rating,
  preload = false,
  className = "",
}) {
  const { name, slug, pricePaise, mrpPaise, images, vibes, stockQty } = product;

  const imageSrc = images?.[0] ?? "/brand/product-ring-red-stone.jpg";
  const soldOut = stockQty === 0;
  const hasDiscount = mrpPaise != null && mrpPaise > pricePaise;
  const discountPercent = hasDiscount
    ? Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100)
    : 0;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border-brand bg-white ${className}`}
    >
      <Link
        href={`/product/${slug}`}
        className="flex flex-1 flex-col focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-surface">
          <Image
            src={imageSrc}
            alt={name}
            width={800}
            height={800}
            preload={preload}
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw"
            className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${soldOut ? "opacity-55" : ""}`}
          />

          {soldOut ? (
            <span className="absolute left-3 top-3 rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Sold out
            </span>
          ) : null}

          {!soldOut && discountPercent >= 10 ? (
            <span className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
              {discountPercent}% off
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap gap-1.5">
            {(vibes ?? []).slice(0, 3).map((vibe) => (
              <span
                key={vibe}
                className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-dark ring-1 ring-border-brand"
              >
                {vibe}
              </span>
            ))}
          </div>

          <h3 className="font-semibold leading-snug text-neutral-900 group-hover:text-brand-dark">
            {name}
          </h3>

          <Rating rating={rating} />

          <p className="mt-auto flex flex-wrap items-baseline gap-2 pt-1">
            <span className="text-lg font-black text-neutral-900">
              {formatPaise(pricePaise)}
            </span>
            {hasDiscount ? (
              <>
                <span className="text-sm text-neutral-400 line-through">
                  {formatPaise(mrpPaise)}
                </span>
                <span className="text-xs font-bold text-brand">
                  {formatPaise(mrpPaise - pricePaise)} off
                </span>
              </>
            ) : null}
          </p>
        </div>
      </Link>
    </article>
  );
}

/**
 * Approved-review stars. Renders nothing at all when the product has no approved reviews,
 * so an unrated product never implies a score.
 */
function Rating({ rating }) {
  if (!rating || rating.count === 0) {
    return <p className="text-xs text-neutral-400">No reviews yet</p>;
  }

  const rounded = Math.round(rating.avg);

  return (
    <p className="flex items-center gap-1.5 text-xs text-neutral-500">
      <span aria-hidden="true" className="tracking-tight text-gold">
        {"★".repeat(rounded)}
        <span className="text-neutral-300">{"★".repeat(5 - rounded)}</span>
      </span>
      <span>
        {rating.avg.toFixed(1)} ({rating.count})
      </span>
      <span className="sr-only">
        {`Rated ${rating.avg} out of 5 from ${rating.count} approved ${
          rating.count === 1 ? "review" : "reviews"
        }`}
      </span>
    </p>
  );
}