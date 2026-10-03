import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Lost? — SideEye",
  description: "That page wandered off. Find your way back to the jewellery.",
};

/**
 * Branded 404 — mascot, zero dead ends: every path leads to shop, track, or
 * contact. Rendered by Next.js for any unknown route, including inactive
 * product slugs (the product page calls `notFound()` for those).
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <Image
        src="/brand/mascot-queen.png"
        alt="SideEye mascot looking sideways"
        width={320}
        height={320}
        sizes="200px"
        className="mx-auto h-40 w-40 rounded-3xl object-cover"
      />
      <p className="mt-6 text-sm font-bold uppercase tracking-widest text-brand-red">
        Side-eye says nope
      </p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        That page gave us the look and left.
      </h1>
      <p className="mt-4 text-neutral-600">
        It moved, sold out, or never existed. The jewellery, thankfully, is
        still here.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/shop"
          className="rounded-2xl bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        >
          Shop the drop
        </Link>
        <Link
          href="/"
          className="rounded-2xl border-2 border-neutral-900 px-6 py-3 font-bold transition hover:bg-neutral-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        >
          Home
        </Link>
        <Link
          href="/track"
          className="rounded-2xl border-2 border-neutral-200 px-6 py-3 font-bold text-neutral-700 transition hover:border-neutral-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        >
          Track order
        </Link>
      </div>
    </div>
  );
}
