import { NextResponse } from "next/server";
import { buildCartLines } from "../../../lib/cart-lines.js";
import { computeTotals } from "../../../lib/pricing.js";

/**
 * Cart contents + server-computed totals.
 *
 * The client posts its `[{ slug, qty }]` cart and gets back enriched lines (name, image,
 * price — all read from the DB) plus totals recomputed here via `computeTotals`. The
 * client never sends or receives a price of its own; the numbers in this response are the
 * only ones the cart page is allowed to display.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That request was not valid JSON." }, { status: 400 });
  }

  const { lines, subtotalPaise } = await buildCartLines(body?.items);

  const totals = computeTotals(
    lines.map((line) => ({ pricePaise: line.product.pricePaise, qty: line.qty })),
    null,
  );

  return NextResponse.json({ lines, subtotalPaise, totals });
}
