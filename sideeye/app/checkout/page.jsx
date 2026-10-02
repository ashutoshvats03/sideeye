import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireUser } from "../../lib/guards.js";
import { parseCartCookie, CART_COOKIE_KEY } from "../../lib/cart.js";
import { buildCartLines } from "../../lib/cart-lines.js";
import { computeTotals } from "../../lib/pricing.js";
import { formatPaise } from "../../lib/money.js";
import { getActiveProductBySlug } from "../../lib/products.js";
import { prisma } from "../../lib/prisma.js";
import { placeOrder } from "../../actions/checkout.js";
import CheckoutForm from "./CheckoutForm.jsx";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  // The cart lives in the browser (localStorage), which the server cannot see.
  // cart-storage mirrors it into a plain slugs-and-quantities cookie on every
  // mutation; that mirror is the server's only view of the cart. Prices and stock
  // are still re-read from the database below, so a tampered cookie cannot change
  // what the shopper is charged.
  const cookieStore = await cookies();
  const cart = parseCartCookie(cookieStore.get(CART_COOKIE_KEY)?.value);
  const { lines: cartLines } = await buildCartLines(cart);

  if (cartLines.length === 0) {
    redirect("/cart");
  }

  // buildCartLines returns `{ product, qty }` pairs; the summary, the totals and
  // CheckoutForm all expect flat lines (`slug`, `name`, `pricePaise`, `qty`).
  const lines = cartLines.map(({ product, qty }) => ({ ...product, qty }));

  const totals = computeTotals(
    lines.map((l) => ({ pricePaise: l.pricePaise, qty: l.qty })),
    null,
  );

  // "Complete the look" rail: same-category in-stock products not already in the cart.
  const cartSlugs = new Set(cart.map((c) => c.slug));
  const suggestions = [];
  for (const line of lines) {
    const product = await getActiveProductBySlug(line.slug);
    if (product?.categoryId) {
      const related = await prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          isActive: true,
          stockQty: { gt: 0 },
          slug: { notIn: [...cartSlugs] },
        },
        select: { slug: true, name: true, pricePaise: true, images: true },
        take: 4,
      });
      suggestions.push(...related);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Checkout</h1>
      <p className="mt-2 text-neutral-600">
        Cash on delivery. No prepaid in v1.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <CheckoutForm
          lines={lines}
          totals={totals}
          suggestions={suggestions}
          user={user}
          placeOrder={placeOrder}
        />

        <aside className="rounded-3xl bg-surface p-6 ring-1 ring-neutral-200">
          <h2 className="font-display text-xl font-bold">Order summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {lines.map((l) => (
              <div key={l.slug} className="flex justify-between">
                <dt>
                  {l.name} × {l.qty}
                </dt>
                <dd className="font-semibold">{formatPaise(l.pricePaise * l.qty)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-neutral-200 pt-3">
              <dt>Subtotal</dt>
              <dd className="font-semibold">{formatPaise(totals.subtotalPaise)}</dd>
            </div>
            {totals.discountPaise > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Discount</dt>
                <dd>-{formatPaise(totals.discountPaise)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd className="font-semibold">
                {totals.shippingPaise === 0 ? "Free" : formatPaise(totals.shippingPaise)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-lg font-bold">
              <dt>Total</dt>
              <dd>{formatPaise(totals.totalPaise)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}