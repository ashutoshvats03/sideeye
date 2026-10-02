import Image from "next/image";
import Link from "next/link";
import PhotoCarousel from "../components/PhotoCarousel.jsx";
import {
  Bestsellers,
  Newsletter,
  PhotoGallery,
  PromiseStrip,
  ReviewsStrip,
  ShopByCategory,
} from "../components/HomeSections.jsx";
import {
  getBestsellers,
  getApprovedRatingMap,
  getCategories,
  getRecentApprovedReviews,
  listProducts,
} from "../lib/products.js";

/**
 * Home page — spec §4 block order:
 * announcement bar → hero → photo carousel → bestsellers → shop-by-category →
 * promise strip → reviews → gallery → newsletter. (Navbar and footer live in layout.jsx.)
 *
 * Server component: every read here is a direct server-side Prisma query, so stock levels
 * and approved-review counts are never served from a client cache or a stale build.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const [bestsellers, categories, reviews, all] = await Promise.all([
    getBestsellers(6),
    getCategories(),
    getRecentApprovedReviews(3),
    listProducts(),
  ]);

  const bestsellersRatingMap = await getApprovedRatingMap(
    bestsellers.map((p) => p.id),
  );

  return (
    <div className="bg-white text-neutral-900">
      <AnnouncementBar />

      <Hero />

      <div className="py-12 md:py-16">
        <PhotoCarousel slides={buildSlides(all.products)} />
      </div>

      <Bestsellers products={bestsellers} ratingMap={bestsellersRatingMap} />
      <ShopByCategory categories={categories} />
      <PromiseStrip />
      <ReviewsStrip reviews={reviews} />
      <PhotoGallery images={buildGallery(all.products)} />
      <Newsletter />
    </div>
  );
}

/** Spec §4 block 1. */
function AnnouncementBar() {
  return (
    <p className="bg-neutral-900 px-4 py-2.5 text-center text-xs font-bold tracking-wide text-white sm:text-sm">
      Free shipping over Rs.999 · Cash on delivery · Anti-tarnish coated
    </p>
  );
}

/** Spec §4 block 3: mascot + tagline + CTAs. */
function Hero() {
  return (
    <section className="overflow-hidden px-4 py-12 md:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
        <div>
          <p className="inline-block rounded-full bg-surface px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-dark ring-1 ring-border-brand">
            New drop
          </p>
          <h1 className="font-display mt-5 text-4xl font-black leading-[1.05] tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
            Worth the
            <span className="block text-brand">second look.</span>
          </h1>
          <p className="mt-5 max-w-prose text-lg text-neutral-600">
            Funky anti-tarnish jewellery that survives real life — and still turns heads by
            evening.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/shop"
              className="rounded-full bg-brand px-8 py-3.5 text-center font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Shop the drop
            </Link>
            <Link
              href="#bestsellers"
              className="rounded-full border-2 border-neutral-900 px-8 py-3.5 text-center font-bold text-neutral-900 transition hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              See bestsellers
            </Link>
          </div>
        </div>

        {/* Source mascot PNG is square with an opaque background, so it is presented as a
            deliberate rounded brand tile rather than a cut-out. */}
        <div className="relative mx-auto w-full max-w-sm">
          <Image
            src="/brand/mascot-queen.png"
            alt="SideEye mascot"
            width={800}
            height={800}
            preload
            sizes="(min-width: 768px) 40vw, 90vw"
            className="w-full rounded-3xl shadow-xl ring-1 ring-neutral-200"
          />
        </div>
      </div>
    </section>
  );
}

/**
 * Carousel slides, spec §4: "product + lifestyle shots from brand assets".
 *
 * Every slide points at a real product route so the photo is a way into the shop. The one
 * non-product shot (a lifestyle photo with no product of its own) still links to the shop.
 */
function buildSlides(products) {
  const slides = [];

  for (const product of products.slice(0, 6)) {
    slides.push({
      src: product.images?.[0],
      alt: product.name,
      caption: product.name,
      href: `/product/${product.slug}`,
    });
  }

  slides.push({
    src: "/brand/lifestyle/ring-on-red-satin.jpg",
    alt: "SideEye ring styled on red satin",
    caption: "Styled, not stashed.",
    href: "/shop",
  });

  return slides.filter((slide) => slide.src);
}

/** Gallery is built from the catalogue itself, so it never shows a dead path. */
function buildGallery(products) {
  return products
    .filter((product) => product.images?.[0])
    .map((product) => ({
      src: product.images[0],
      alt: product.name,
    }));
}