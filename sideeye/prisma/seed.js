// Idempotent seed — safe to run repeatedly.
//
// Plan 01 Task 3 seeded the 6 locked categories; Plan 03 Task 1 added the product
// catalogue and demo reviews so the home page has real content to render.
//
// Uses the generated Prisma Client (Prisma 7 requires an explicit generator output
// path; see prisma/schema.prisma) plus the pg driver adapter, which Prisma 7 also
// requires. The adapter is created from DATABASE_URL directly so this file works
// when run via `bunx prisma db seed` (Node) as well as `bun prisma/seed.js`.

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * The 6 categories are a locked product decision (spec §7): exactly these, no more,
 * no fewer. Each has a shop-by-category image.
 */
const CATEGORIES = [
  { name: "Necklace", slug: "necklace", image: "/brand/products/blush-heart-necklace.jpg", sortOrder: 1 },
  { name: "Earring", slug: "earring", image: "/brand/products/beaded-cascade-earrings.jpg", sortOrder: 2 },
  { name: "Anklet", slug: "anklet", image: "/brand/products/prism-line-bracelet.jpg", sortOrder: 3 },
  { name: "Ring", slug: "ring", image: "/brand/products/ruby-ember-ring.jpg", sortOrder: 4 },
  { name: "Bracelet", slug: "bracelet", image: "/brand/products/prism-line-bracelet.jpg", sortOrder: 5 },
  { name: "Arm Bracelet", slug: "arm-bracelet", image: "/brand/products/petal-cuff-arm-bracelet.jpg", sortOrder: 6 },
];

/**
 * Product catalogue.
 *
 * Every price is integer paise. Never write rupees here — see spec §2.
 *
 * Each `image` was individually inspected before being copied from the raw brand assets
 * into public/brand/products/. Two files in the source folder (IMG-...-WA0055 and
 * IMG-...-WA0091) are WATCHES, not jewellery, and were deliberately excluded.
 *
 * ANKLET HAS NO PRODUCTS ON PURPOSE: none of the raw photos depicts an anklet, and
 * inventing one by mis-filing another category's photo would be worse than an empty
 * category. It still has a Category row so shop-by-category can link to it.
 */
const PRODUCTS = [
  // --- Ring -----------------------------------------------------------------
  {
    slug: "ruby-ember-ring",
    name: "Ruby Ember Ring",
    categorySlug: "ring",
    pricePaise: 44900,
    mrpPaise: 59900,
    stockQty: 12,
    vibes: ["Queen", "Slay"],
    tags: ["statement", "red"],
    images: ["/brand/products/ruby-ember-ring.jpg", "/brand/lifestyle/ring-on-red-satin.jpg"],
    description:
      "A wide gold band crowned with a deep ruby-red cabochon. Bold enough to be the only ring you wear.",
    materials: "Gold-tone alloy, glass cabochon",
    care: "Wipe with a soft dry cloth. Keep away from perfume and water.",
    ratingAvg: 4.8,
    ratingCount: 126,
  },
  {
    slug: "marble-halo-ring",
    name: "Marble Halo Ring",
    categorySlug: "ring",
    pricePaise: 52900,
    mrpPaise: 69900,
    stockQty: 8,
    vibes: ["Queen"],
    tags: ["chunky", "minimal"],
    images: ["/brand/products/marble-halo-ring.jpg"],
    description:
      "Chunky interlocking gold links with a white marble centre. Quiet luxury, loud silhouette.",
    materials: "Gold-tone alloy, marble-effect stone",
    care: "Avoid lotions and chemicals. Store in the pouch provided.",
    ratingAvg: 4.7,
    ratingCount: 64,
  },
  {
    slug: "desert-bloom-ring",
    name: "Desert Bloom Ring",
    categorySlug: "ring",
    pricePaise: 34900,
    mrpPaise: 44900,
    stockQty: 15,
    vibes: ["Baddie", "Funky"],
    tags: ["pink", "floral"],
    images: ["/brand/products/desert-bloom-ring.jpg"],
    description:
      "A pink enamel flower with a pavé dragonfly. Open band, so it stacks or wears solo.",
    materials: "Gold-tone alloy, enamel, rhinestone",
    care: "Enamel scratches easily — keep it away from rough surfaces.",
    ratingAvg: 4.6,
    ratingCount: 92,
  },
  {
    slug: "turquoise-tide-ring",
    name: "Turquoise Tide Ring",
    categorySlug: "ring",
    pricePaise: 29900,
    mrpPaise: 39900,
    stockQty: 20,
    vibes: ["Funky"],
    tags: ["turquoise", "statement"],
    images: ["/brand/products/turquoise-tide-ring.jpg"],
    description:
      "A wave of turquoise cabochons across an adjustable open ring. Instant colour, zero effort.",
    materials: "Gold-tone alloy, glass cabochons",
    care: "Polish gently with a soft cloth to restore shine.",
    ratingAvg: 4.5,
    ratingCount: 47,
  },

  // --- Earring --------------------------------------------------------------
  {
    slug: "beaded-cascade-earrings",
    name: "Beaded Cascade",
    categorySlug: "earring",
    pricePaise: 32900,
    mrpPaise: 42900,
    stockQty: 14,
    vibes: ["Eye Special", "Funky"],
    tags: ["colourful", "drop"],
    images: ["/brand/products/beaded-cascade-earrings.jpg"],
    description:
      "Teal, red and green glass beads cascading on a gold chain. The pair that gets asked about.",
    materials: "Gold-tone alloy, glass beads",
    care: "Store flat so the drop does not stretch.",
    ratingAvg: 4.9,
    ratingCount: 211,
  },
  {
    slug: "meadow-drop-earrings",
    name: "Meadow Drop",
    categorySlug: "earring",
    pricePaise: 37900,
    mrpPaise: 49900,
    stockQty: 10,
    vibes: ["Eye Special"],
    tags: ["floral", "green"],
    images: ["/brand/products/meadow-drop-earrings.jpg"],
    description:
      "A hammered gold flower with a jade-green drop. Delicate on the ear, impossible to ignore.",
    materials: "Gold-tone alloy, resin stone",
    care: "Keep dry. Avoid ultrasonic cleaners.",
    ratingAvg: 4.7,
    ratingCount: 78,
  },
  {
    slug: "tortoise-teardrop-earrings",
    name: "Tortoise Teardrop",
    categorySlug: "earring",
    pricePaise: 28900,
    mrpPaise: 38900,
    stockQty: 16,
    vibes: ["Queen", "Slay"],
    tags: ["statement", "neutral"],
    images: ["/brand/products/tortoise-teardrop-earrings.jpg"],
    description:
      "Cream and tortoise-shell teardrops on a hammered gold disc. Big shape, neutral palette.",
    materials: "Gold-tone alloy, resin",
    care: "Wipe dry only.",
    ratingAvg: 4.6,
    ratingCount: 58,
  },
  {
    slug: "prism-cross-earrings",
    name: "Prism Cross",
    categorySlug: "earring",
    pricePaise: 24900,
    mrpPaise: 32900,
    stockQty: 22,
    vibes: ["Eye Special"],
    tags: ["geometric", "multicolour"],
    images: ["/brand/products/prism-cross-earrings.jpg"],
    description:
      "A crystal cross cut from amber, ruby and amethyst baguettes. Sharp geometry, warm colour.",
    materials: "Gold-tone alloy, glass baguette stones, crystal",
    care: "Avoid knocks — the baguette settings are delicate.",
    ratingAvg: 4.5,
    ratingCount: 41,
  },

  // --- Necklace -------------------------------------------------------------
  {
    slug: "blush-heart-necklace",
    name: "Blush Heart",
    categorySlug: "necklace",
    pricePaise: 45900,
    mrpPaise: 59900,
    stockQty: 11,
    vibes: ["Baddie", "Funky"],
    tags: ["pink", "heart"],
    images: ["/brand/products/blush-heart-necklace.jpg"],
    description:
      "A blush crystal heart halo on a fine gold chain, flanked by pink stones. Soft, unmistakably pink.",
    materials: "Gold-tone alloy, crystal, glass stones",
    care: "Keep away from perfume. Polish with a dry cloth.",
    ratingAvg: 4.8,
    ratingCount: 143,
  },
  {
    slug: "sea-glass-heart-necklace",
    name: "Sea Glass Heart",
    categorySlug: "necklace",
    pricePaise: 39900,
    mrpPaise: 52900,
    stockQty: 13,
    vibes: ["Funky", "Eye Special"],
    tags: ["green", "minimal"],
    images: ["/brand/products/sea-glass-heart-necklace.jpg"],
    description:
      "A polished sea-glass cabochon heart on a barely-there chain, finished with a single crystal.",
    materials: "Gold-tone alloy, glass cabochon, crystal",
    care: "Do not sleep or swim in it. Store in the pouch.",
    ratingAvg: 4.7,
    ratingCount: 89,
  },
  {
    slug: "crystal-halo-heart-necklace",
    name: "Crystal Halo Heart",
    categorySlug: "necklace",
    pricePaise: 54900,
    mrpPaise: 72900,
    stockQty: 7,
    vibes: ["Queen", "Baddie"],
    tags: ["pink", "halo", "gift"],
    images: ["/brand/products/crystal-halo-heart-necklace.jpg"],
    description:
      "A pave halo heart in blush pink and clear crystal, on a fine chain. Ships boxed and ready to gift.",
    materials: "Gold-tone alloy, crystal, glass stones",
    care: "Store separately so the pave does not scratch.",
    ratingAvg: 4.9,
    ratingCount: 97,
  },

  // --- Bracelet -------------------------------------------------------------
  {
    slug: "prism-line-bracelet",
    name: "Prism Line",
    categorySlug: "bracelet",
    pricePaise: 48900,
    mrpPaise: 64900,
    stockQty: 9,
    vibes: ["Slay", "Eye Special"],
    tags: ["multicolour", "stone"],
    images: ["/brand/products/prism-line-bracelet.jpg"],
    description:
      "A fluid chain of amethyst, citrine and emerald-cut stones in gold. Every link catches light.",
    materials: "Gold-tone alloy, glass stones",
    care: "Avoid lotions. Wipe dry after wear.",
    ratingAvg: 4.8,
    ratingCount: 134,
  },
  {
    slug: "golden-hour-charm-bracelet",
    name: "Golden Hour Charm Bracelet",
    categorySlug: "bracelet",
    pricePaise: 55900,
    mrpPaise: 69900,
    stockQty: 6,
    vibes: ["Baddie"],
    tags: ["charms", "layering"],
    images: ["/brand/products/golden-hour-charm-bracelet.jpg"],
    description:
      "Paperclip links loaded with a moon, dragonfly, sun, cherry and bells. Stack it or wear it loud.",
    materials: "Gold-tone alloy",
    care: "Charms catch on knitwear — tuck under a cuff.",
    ratingAvg: 4.9,
    ratingCount: 176,
  },
  {
    slug: "ruby-road-bracelet",
    name: "Ruby Road",
    categorySlug: "bracelet",
    pricePaise: 42900,
    mrpPaise: 56900,
    stockQty: 10,
    vibes: ["Slay", "Queen"],
    tags: ["red", "statement"],
    images: ["/brand/products/ruby-road-bracelet.jpg"],
    description:
      "An emerald-cut ruby centre flanked by emerald green and white. Made for the loudest outfit you own.",
    materials: "Gold-tone alloy, glass stones",
    care: "Polish with a soft cloth. Do not expose to chlorine.",
    ratingAvg: 4.7,
    ratingCount: 72,
  },
  {
    slug: "blush-tennis-bracelet",
    name: "Blush Tennis Bracelet",
    categorySlug: "bracelet",
    pricePaise: 36900,
    mrpPaise: 47900,
    // Deliberately out of stock so the sold-out UI and the related-rail stock filter
    // both have something real to exclude.
    stockQty: 0,
    vibes: ["Baddie", "Funky"],
    tags: ["pink", "tennis"],
    images: ["/brand/products/blush-tennis-bracelet.jpg"],
    description:
      "A line of blush crystal with a pavé charm, on a fine snake chain.",
    materials: "Gold-tone alloy, crystal",
    care: "Store flat. Avoid chemicals.",
    ratingAvg: 4.6,
    ratingCount: 55,
  },

  // --- Arm Bracelet ---------------------------------------------------------
  {
    slug: "petal-cuff-arm-bracelet",
    name: "Petal Cuff",
    categorySlug: "arm-bracelet",
    pricePaise: 59900,
    mrpPaise: 79900,
    stockQty: 5,
    vibes: ["Slay", "Baddie"],
    tags: ["cuff", "floral", "statement"],
    images: ["/brand/products/petal-cuff-arm-bracelet.jpg"],
    description:
      "An adjustable open cuff with a pink and lilac enamel flower. Sits above the elbow bone.",
    materials: "Gold-tone alloy, enamel, crystal",
    care: "Adjust gently. Enamel dislikes pressure.",
    ratingAvg: 4.8,
    ratingCount: 61,
  },
];

/**
 * A clearly-fake demo account so the home reviews block and the product pages have
 * approved reviews to show. `.test` is a reserved TLD, so this can never collide with a
 * real Google account.
 */
const DEMO_REVIEWER = {
  email: "demo.reviewer@sideeye.test",
  name: "Aanya",
  avatar: null,
};

/** Approved reviews. `rating` is 1..5, matching the zod check on the POST route. */
const REVIEWS = [
  {
    email: DEMO_REVIEWER.email,
    slug: "beaded-cascade-earrings",
    rating: 5,
    text: "Three people asked where these were from in one day. Not tarnish at all after a month of daily wear.",
  },
  {
    email: DEMO_REVIEWER.email,
    slug: "ruby-ember-ring",
    rating: 5,
    text: "The red is genuinely red, not orange. Heavy in a good way.",
  },
  {
    email: DEMO_REVIEWER.email,
    slug: "golden-hour-charm-bracelet",
    rating: 5,
    text: "Stacks perfectly with a plain chain. Charms have not come loose once.",
  },
  {
    email: DEMO_REVIEWER.email,
    slug: "crystal-halo-heart-necklace",
    rating: 4,
    text: "Gorgeous and it came boxed. Chain is finer than I expected, so size up if you like a chunky look.",
  },
];

async function seedCategories() {
  console.log(`Seeding ${CATEGORIES.length} categories...`);
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, image: category.image, sortOrder: category.sortOrder },
      create: category,
    });
  }

  const count = await prisma.category.count();
  console.log(`Categories in DB after seed: ${count}`);
  if (count !== CATEGORIES.length) {
    throw new Error(
      `Seed is not idempotent: expected ${CATEGORIES.length} categories, found ${count}`,
    );
  }
}

async function seedProducts() {
  console.log(`Seeding ${PRODUCTS.length} products...`);

  // Resolve category ids once rather than per product.
  const categories = await prisma.category.findMany();
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  for (const product of PRODUCTS) {
    const { categorySlug, ...fields } = product;
    const categoryId = categoryIdBySlug.get(categorySlug);
    if (!categoryId) throw new Error(`unknown category slug: ${categorySlug}`);

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: { ...fields, categoryId },
      create: { ...fields, categoryId },
    });
  }

  const count = await prisma.product.count();
  console.log(`Products in DB after seed: ${count}`);
  if (count !== PRODUCTS.length) {
    throw new Error(
      `Seed is not idempotent: expected ${PRODUCTS.length} products, found ${count}`,
    );
  }
}

async function seedReviews() {
  console.log(`Seeding ${REVIEWS.length} reviews...`);

  const user = await prisma.user.upsert({
    where: { email: DEMO_REVIEWER.email },
    update: { name: DEMO_REVIEWER.name, isActive: true },
    create: {
      email: DEMO_REVIEWER.email,
      name: DEMO_REVIEWER.name,
      role: "customer",
      isActive: true,
    },
  });

  const products = await prisma.product.findMany({ select: { id: true, slug: true } });
  const productIdBySlug = new Map(products.map((p) => [p.slug, p.id]));

  for (const review of REVIEWS) {
    const productId = productIdBySlug.get(review.slug);
    if (!productId) throw new Error(`review references unknown product: ${review.slug}`);

    // Review has @@unique([productId, userId]), so upsert on that pair.
    await prisma.review.upsert({
      where: { productId_userId: { productId, userId: user.id } },
      update: { rating: review.rating, text: review.text, isApproved: true },
      create: {
        productId,
        userId: user.id,
        rating: review.rating,
        text: review.text,
        isApproved: true,
      },
    });
  }

  const count = await prisma.review.count();
  console.log(`Reviews in DB after seed: ${count}`);
  if (count !== REVIEWS.length) {
    throw new Error(
      `Seed is not idempotent: expected ${REVIEWS.length} reviews, found ${count}`,
    );
  }
}

async function main() {
  await seedCategories();
  await seedProducts();
  await seedReviews();
  console.log("Seed OK — counts match expectation.");
}

main()
  .catch((err) => {
    console.error("Seed FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });