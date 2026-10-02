import { NextResponse } from "next/server";
import { buildCartLines } from "../../../lib/cart-lines.js";
import { computeTotals } from "../../../lib/pricing.js";
import { validateCoupon, CouponError } from "../../../lib/coupons.js";
import { getCurrentUser } from "../../../lib/guards.js";
import { prisma } from "../../../lib/prisma.js";

/**
 * Validate a coupon against the current cart and return the resulting totals.
 *
 * The discount is computed server-side from DB prices via `computeTotals`; the client only
 * sends the code and its cart. The signed-in user is read from the session here rather
 * than trusted from the body, so a per-user coupon cannot be applied by somebody else.
 *
 * Rate limiting is added in Plan 04 Task 3 (`lib/rate-limit.js`).
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That request was not valid JSON." }, { status: 400 });
  }

  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Enter a coupon code first." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const userId = user?.id ?? null;

  const { lines, subtotalPaise } = await buildCartLines(body?.items);
  const lineItems = lines.map((line) => ({
    pricePaise: line.product.pricePaise,
    qty: line.qty,
  }));

  const coupon = await prisma.coupon.findUnique({ where: { code } });

  let userCoupon = null;
  if (coupon && userId) {
    userCoupon = await prisma.userCoupon.findUnique({
      where: { userId_couponId: { userId, couponId: coupon.id } },
    });
  }

  try {
    const valid = validateCoupon({ code, userId, subtotalPaise, coupon, userCoupon });
    const totals = computeTotals(lineItems, valid);
    return NextResponse.json({
      ok: true,
      coupon: { code: valid.code, type: valid.type, value: valid.value },
      totals,
    });
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: 400 },
      );
    }
    throw error;
  }
}
