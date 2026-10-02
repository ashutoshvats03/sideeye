// Idempotent seed — safe to run repeatedly.
//
// Plan 01 Task 3 step 3/4: upsert the 6 locked categories and prove a second run
// creates zero duplicates.
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
  { name: "Necklace", slug: "necklace", image: "/brand/product-necklace-pink-heart.jpg", sortOrder: 1 },
  { name: "Earring", slug: "earring", image: "/brand/product-ring-red-stone.jpg", sortOrder: 2 },
  { name: "Anklet", slug: "anklet", image: "/brand/about-mascot.jpg", sortOrder: 3 },
  { name: "Ring", slug: "ring", image: "/brand/product-ring-red-stone.jpg", sortOrder: 4 },
  { name: "Bracelet", slug: "bracelet", image: "/brand/product-bracelet-gemstone.jpg", sortOrder: 5 },
  { name: "Arm Bracelet", slug: "arm-bracelet", image: "/brand/product-bracelet-gemstone.jpg", sortOrder: 6 },
];

async function main() {
  console.log(`Seeding ${CATEGORIES.length} categories...`);

  // upsert on the unique slug: run 1 inserts, run N updates. Never duplicates.
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        image: category.image,
        sortOrder: category.sortOrder,
      },
      create: category,
    });
  }

  const count = await prisma.category.count();
  console.log(`Categories in DB after seed: ${count}`);

  if (count !== CATEGORIES.length) {
    throw new Error(
      `Seed is not idempotent: expected ${CATEGORIES.length} categories, found ${count}`
    );
  }
  console.log("Seed OK — category count matches expectation.");
}

main()
  .catch((err) => {
    console.error("Seed FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
