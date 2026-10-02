import Image from "next/image";
import Link from "next/link";
import ProductCard from "./ProductCard.jsx";

/**
 * Static, server-rendered home page sections.
 *
 * One responsibility per export so each block can be read (and changed) on its own, and
 * so the page file stays an ordered list of the spec §4 blocks rather than a wall of JSX.
 *
 * No component here is interactive, so none of it ships client JavaScript.
 */

/** Consistent section shell: max width, padding rhythm, and a heading that levels h2. */
function Section({ id, title, subtitle, action, children, className = "" }) {
  return (
    <section id={id} className={`px-4 py-12 md:py-16 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-black tracking-tight text-neutral-900 md:text-4xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-2 max-w-prose text-neutral-600">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

/** "See all" affordance used above rails. */
export function SeeAll({ href, label = "See all" }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-full border-2 border-neutral-900 px-5 py-2 text-sm font-bold text-neutral-900 transition hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {label}
    </Link>
  );
}

/** Bestsellers rail — most-reviewed active products. */
export function Bestsellers({ products, ratingMap }) {
  if (products.length === 0) return null;

  return (
    <Section
      id="bestsellers"
      title="The ones going fast"
      subtitle="Most-reviewed pieces from the drop — people keep coming back."
      action={<SeeAll href="/shop" label="Shop all" />}
      className="bg-surface"
    >
      {/*
        Deliberately NOT preloaded. This section sits well below the hero and carousel on
        every viewport including 360px, and Next's Image docs advise against preloading
        several LCP candidates at once — it would compete with the hero for bandwidth.
        The cards keep their `sizes`, so lazy loading still fetches the right width.
      */}
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard
              product={product}
              rating={ratingMap.get(product.id)}
              className="h-full"
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Shop-by-category tiles. */
export function ShopByCategory({ categories }) {
  if (categories.length === 0) return null;

  return (
    <Section
      id="categories"
      title="Shop by category"
      subtitle="Six families, zero boring pieces."
    >
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/shop?category=${category.slug}`}
              className="group relative block overflow-hidden rounded-2xl border border-border-brand focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    width={800}
                    height={1000}
                    sizes="(min-width: 768px) 30vw, 50vw"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-900/85 to-transparent p-4">
                <p className="text-lg font-black text-white">{category.name}</p>
                <p className="text-xs font-semibold text-white/80">
                  {category.productCount === 0
                    ? "Coming soon"
                    : `${category.productCount} ${
                        category.productCount === 1 ? "piece" : "pieces"
                      }`}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Three-line promise strip. Static copy: no claims the build cannot honour. */
export function PromiseStrip() {
  const promises = [
    {
      title: "Anti-tarnish promise",
      body: "Water-resistant coating so it still looks new after a full day.",
    },
    {
      title: "Free shipping over Rs.999",
      body: "Flat Rs.49 below that. Cash on delivery, always.",
    },
    {
      title: "Second-look guarantee",
      body: "Wrong size or not your vibe? Swap or refund within 7 days.",
    },
  ];

  return (
    <Section className="bg-neutral-900 py-12 text-white">
      <ul className="grid gap-8 sm:grid-cols-3">
        {promises.map((promise) => (
          <li key={promise.title} className="text-center">
            <h3 className="font-display text-xl font-black">{promise.title}</h3>
            <p className="mt-2 text-sm text-white/75">{promise.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * Testimonial strip from approved reviews.
 *
 * The count shown is the number of approved reviews rendered here, and the stars come
 * from the review row itself — never from a denormalised counter that could include
 * unapproved submissions.
 */
export function ReviewsStrip({ reviews }) {
  if (reviews.length === 0) return null;

  return (
    <Section
      id="reviews"
      title="Straight from the group chat"
      className="bg-surface"
    >
      <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="flex flex-col rounded-2xl border border-border-brand bg-white p-6"
          >
            <p aria-hidden="true" className="tracking-tight text-gold">
              {"★".repeat(review.rating)}
              <span className="text-neutral-200">
                {"★".repeat(5 - review.rating)}
              </span>
            </p>
            <blockquote className="mt-3 flex-1 text-neutral-700">
              {review.text ?? "Loved it."}
            </blockquote>
            <footer className="mt-4 text-sm">
              <span className="font-bold text-neutral-900">
                {review.user?.name ?? "SideEye customer"}
              </span>
              {review.product ? (
                <span className="text-neutral-500">
                  {" on "}
                  <Link
                    href={`/product/${review.product.slug}`}
                    className="underline hover:text-brand-dark"
                  >
                    {review.product.name}
                  </Link>
                </span>
              ) : null}
            </footer>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * Photo grid.
 *
 * A fixed grid of square-cropped tiles: mixing portrait and landscape source photos into
 * one ragged masonry grid is what causes layout shift, so every tile reserves the same
 * box before its image arrives.
 */
export function PhotoGallery({ images = [] }) {
  if (images.length === 0) return null;

  return (
    <Section id="gallery" title="The full drop">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {images.map((image, i) => (
          <li key={image.src} className="relative aspect-square overflow-hidden rounded-xl bg-surface">
            <Image
              src={image.src}
              alt={image.alt}
              width={600}
              height={600}
              loading="lazy"
              sizes="(min-width: 768px) 25vw, 50vw"
              className="h-full w-full object-cover"
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * Newsletter capture.
 *
 * v1 has no marketing-email service, so this is an honest non-submitting form rather than
 * a button that silently discards an address. Wired to a real provider in Plan 06.
 */
export function Newsletter() {
  return (
    <Section className="bg-brand text-white">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-3xl font-black tracking-tight md:text-4xl">
          Get the next drop first
        </h2>
        <p className="mt-3 text-white/90">
          Restocks and new drops go out before they hit the shop.
        </p>
        <form className="mt-8 flex flex-col gap-3 sm:flex-row" aria-describedby="newsletter-note">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@email.com"
            className="w-full rounded-full border-2 border-transparent bg-white px-5 py-3 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
          />
          <button
            type="button"
            className="shrink-0 rounded-full bg-neutral-900 px-8 py-3 font-bold text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Keep me posted
          </button>
        </form>
        <p id="newsletter-note" className="mt-3 text-xs text-white/75">
          Sign-ups open with the next drop — nothing to sign up for yet.
        </p>
      </div>
    </Section>
  );
}