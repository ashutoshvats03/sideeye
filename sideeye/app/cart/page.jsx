import CartClient from "../../components/CartClient.jsx";

export const dynamic = "force-dynamic";

/**
 * The bag.
 *
 * The cart lives in localStorage, so there is nothing to read on the server — this page
 * only renders the client island that owns the cart. Money is never computed here; the
 * island asks `/api/cart` for server-computed totals.
 */
export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Your bag</h1>
      <p className="mt-1 text-neutral-600">
        Everything you have set aside for a second look.
      </p>
      <div className="mt-8">
        <CartClient />
      </div>
    </div>
  );
}
