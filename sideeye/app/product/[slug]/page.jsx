import { notFound } from "next/navigation";
import Link from "next/link";
import AddToCart from "../../../components/AddToCart.jsx";
import Gallery from "../../../components/Gallery.jsx";
import ProductCard from "../../../components/ProductCard.jsx";
import Reviews from "../../../components/Reviews.jsx";
import { getCurrentUser } from "../../../lib/guards.js";
import { formatPaise } from "../../../lib/money.js";
import {
  getActiveProductBySlug,
  getApprovedRatingMap,
  getApprovedRatingSummary,
  getApprovedReviews,
  getRelatedProducts,
} from "../../../lib/products.js";
import { hasPurchasedProduct } from "../../../lib/orders.js";

/**
 * Product detail — spec §5 block order:
 *   gallery -> name + price/MRP -> rating -> vibe stickers -> qty ->
 *   Add to bag / Buy it now -> accordions -> pincode estimate -> reviews -> related rail
 *
 * `getActiveProductBySlug` returns null for BOTH a missing slug and a deactivated product,
 * so an inactive product 404s identically to one that never existed (plan Review Focus: a
 * direct URL to an inactive product must not render it).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) return { title: "Piece not found — SideEye" };
  return {
    title: `${product.name} — SideEye`,
    description: product.description?.slice(0, 155) ?? undefined,
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();

  const user = await getCurrentUser();

  const [reviews, summary, related, hasBought] = await Promise.all([
    getApprovedReviews(product.id),
    getApprovedRatingSummary(product.id),
    getRelatedProducts(product, 4),
    // Only buyers may review (spec §5). A signed-out visitor is not asked the question.
    user ? hasPurchasedProduct(user.id, product.id) : Promise.resolve(false),
  ]);

  const relatedRatingMap = await getApprovedRatingMap(related.map((p) => p.id));

  const mrpPaise = product.mrpPaise ?? null;
  const hasDiscount = mrpPaise != null && mrpPaise > product.pricePaise;
  const discountPaise = hasDiscount ? mrpPaise - product.pricePaise : 0;
  const discountPercent = hasDiscount
    ? Math.round((discountPaise / mrpPaise) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-neutral-600">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-brand-red">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/shop?category=${product.category.slug}`}
              className="hover:text-brand-red"
            >
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-semibold text-neutral-900">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <Gallery images={product.images} alt={product.name} />

        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <p className="text-2xl font-bold text-brand-red">
                {formatPaise(product.pricePaise)}
              </p>
              {hasDiscount ? (
                <>
                  <p className="text-lg text-neutral-500 line-through">
                    {formatPaise(mrpPaise)}
                  </p>
                  <p className="rounded-full bg-brand px-3 py-1 text-sm font-bold text-white">
                    {formatPaise(discountPaise)} off &middot; {discountPercent}%
                  </p>
                </>
              ) : null}
            </div>

            {summary && summary.count > 0 ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
                <span aria-hidden="true" className="text-gold">
                  {"\u2605".repeat(Math.round(summary.avg))}
                </span>
                <span>
                  {summary.avg.toFixed(1)} &middot;{" "}
                  {summary.count}{" "}
                  {summary.count === 1 ? "review" : "reviews"}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-neutral-600">Not rated yet.</p>
            )}
          </div>

          {product.vibes.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Vibes">
              {product.vibes.map((vibe) => (
                <li
                  key={vibe}
                  className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-brand-dark ring-1 ring-border-brand"
                >
                  {vibe}
                </li>
              ))}
            </ul>
          ) : null}

          <AddToCart product={product} />

          <div className="space-y-2">
            <Details summary="Description">
              <p className="whitespace-pre-line">{product.description}</p>
            </Details>

            {product.materials ? (
              <Details summary="Materials">
                <p>{product.materials}</p>
              </Details>
            ) : null}

            {product.care ? (
              <Details summary="Care">
                <p className="whitespace-pre-line">{product.care}</p>
              </Details>
            ) : null}

            <Details summary="Shipping and cash on delivery">
              <p>
                Flat Rs.49 shipping, free on orders above Rs.999. Cash on delivery is
                available at checkout — you pay the courier when the piece reaches you.
              </p>
            </Details>
          </div>

          <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-neutral-700">
            <span className="font-semibold">Delivery estimate.</span> Enter your pincode
            at checkout for a date range. Dispatched in 2&ndash;4 working days.
          </p>
        </div>
      </div>

      <Reviews
        productId={product.id}
        reviews={reviews}
        summary={summary}
        isSignedIn={Boolean(user)}
        canReview={Boolean(user) && hasBought}
      />

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="font-display text-2xl">
            You may also like
          </h2>
          <ul
            className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
            aria-label="Related products"
          >
            {related.map((item) => (
              <li key={item.id} className="h-full">
                <ProductCard
                  product={item}
                  rating={relatedRatingMap.get(item.id)}
                  className="h-full"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Native <details>/<summary> accordion: keyboard operable with no JavaScript at all. */
function Details({ summary, children }) {
  return (
    <details className="group rounded-2xl border-2 border-neutral-200 bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 font-semibold marker:hidden">
        {summary}
      </summary>
      <div className="border-t-2 border-neutral-100 px-5 py-4 text-neutral-700">
        {children}
      </div>
    </details>
  );
}