import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma.js";
import { CARD_SELECT } from "../../../lib/products.js";
import { parseWishlist } from "../../../lib/wishlist.js";

/**
 * Wishlist slug resolution.
 *
 * The client posts its locally stored slugs and gets back card data for the
 * ones that are still live and active — prices, names and images always come
 * from the database, never from the client. Inactive or unknown slugs are
 * silently dropped (the page reports how many vanished).
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That request was not valid JSON." }, { status: 400 });
  }

  const slugs = parseWishlist(body?.slugs).slice(0, 100);
  if (slugs.length === 0) return NextResponse.json({ products: [] });

  const rows = await prisma.product.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: CARD_SELECT,
  });

  const order = new Map(slugs.map((slug, i) => [slug, i]));
  rows.sort((a, b) => order.get(a.slug) - order.get(b.slug));

  return NextResponse.json({ products: rows });
}
