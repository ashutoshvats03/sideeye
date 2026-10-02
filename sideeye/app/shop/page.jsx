import Image from "next/image";
import Link from "next/link";
import ProductCard from "../../components/ProductCard.jsx";
import ShopFilters from "../../components/ShopFilters.jsx";
import { getCategories, listProducts } from "../../lib/products.js";
import { parseShopParams, hasActiveFilters } from "../../lib/shop-filters.js";

export const metadata = {
  title: "Shop — SideEye",
  description: "Anti-tarnish jewellery worth the second look.",
};

// Filters arrive as URL query params, so this page cannot be statically cached.
export const dynamic = "force-dynamic";

/**
 * Empty state for a filtered-to-nothing grid.
 *
 * A blank white page reads as a broken site. This names the problem, offers the one action
 * that resolves it, and points at a real alternative so the shopper is never stranded.
 */
function ShopEmptyState({ state, categories }) {
  const suggestion = state.category
    ? categories.find((c) => c.slug !== state.category)
    : categories[0];

  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl bg-surface px-6 py-16 text-center">
      {/* The mascot PNG has an opaque background, so it is shown as a deliberate rounded
          brand tile (same treatment as the home hero) rather than a cut-out. Without the
          tile it dissolves into the light surface and reads as a missing image. */}
      <Image
        src="/brand/mascot-queen.png"
        alt=""
        width={800}
        height={800}
        className="h-24 w-24 rounded-2xl object-cover shadow-md ring-1 ring-neutral-200"
      />
      <div>
        <h2 className="font-display text-2xl font-extrabold text-neutral-900">
          Nothing in this corner yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-neutral-600">
          No piece matches every filter at once. Loosen one and the shelf fills back up.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/shop"
          className="rounded-2xl bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        >
          Clear all filters
        </Link>
        {suggestion ? (
          <Link
            href={`/shop?category=${suggestion.slug}`}
            className="rounded-2xl border-2 border-neutral-900 px-6 py-3 font-bold text-neutral-900 transition hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          >
            Browse {suggestion.name}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default async function ShopPage({ searchParams }) {
  const params = await searchParams;
  const state = parseShopParams(params);

  // `parseShopParams` calls its output `category`; `buildProductWhere` expects `categorySlug`.
  const [{ products, ratingMap }, categories] = await Promise.all([
    listProducts({
      categorySlug: state.category,
      vibe: state.vibe,
      q: state.q,
      sort: state.sort,
    }),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-wide text-brand">
          The whole drop
        </p>
        <h1 className="font-display mt-2 text-4xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">
          Shop the drop
        </h1>
        <p className="mt-3 text-neutral-600">
          Anti-tarnish coated, funkier than your feed. Filter by the vibe you are chasing.
        </p>
      </header>

      <ShopFilters
        categories={categories}
        state={state}
        resultCount={products.length}
      />

      <div className="mt-8">
        {products.length === 0 ? (
          <ShopEmptyState state={state} categories={categories} />
        ) : (
          <ul
            className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4"
            aria-label="Products"
          >
            {products.map((product) => (
              <li key={product.id} className="h-full">
                <ProductCard
                  product={product}
                  rating={ratingMap.get(product.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {products.length > 0 && hasActiveFilters(state) ? (
        <p className="mt-10 text-center text-sm text-neutral-500">
          Not seeing it?{" "}
          <Link href="/shop" className="font-bold text-brand-dark underline">
            Reset the filters
          </Link>
        </p>
      ) : null}
    </div>
  );
}