"use client";

import { useEffect } from "react";
import { clearCart } from "../lib/cart-storage.js";

/**
 * Empties the browser cart once an order is confirmed.
 *
 * The cart lives in localStorage (mirrored into a cookie so the server can read it at
 * checkout), so only the browser can clear it: resetting the cookie server-side would leave
 * localStorage holding the lines that were just ordered, and the header badge would keep
 * showing them. `clearCart()` writes the empty cart, refreshes the cookie mirror and fires
 * `CART_CHANGED_EVENT`, which is the event the badge listens for — so the bag drops to 0
 * without a reload.
 *
 * Rendered only by the order-success page, which is reachable only for an order that really
 * belongs to the signed-in shopper, so this cannot wipe a cart that was refilled after the
 * order was placed. Idempotent, so a double-invoked effect or a back/forward navigation is
 * harmless.
 */
export default function ClearCartAfterOrder() {
  useEffect(() => {
    clearCart();
  }, []);
  return null;
}
