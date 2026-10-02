import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-white text-neutral-900">
      <section className="bg-brand px-4 py-10 text-center text-white">
        {/* Source logo is 1254x1254 RGB with an opaque red background (no alpha),
            so it renders as a deliberate rounded brand tile rather than a transparent mark. */}
        <Image
          src="/brand/logo-lockup-red.png"
          alt="SideEye — Worth the second look"
          width={1254}
          height={1254}
          priority
          className="mx-auto w-56 rounded-2xl shadow-lg ring-1 ring-white/20 md:w-72"
        />
      </section>

      <section className="px-4 py-12">
        <h1 className="text-center text-3xl font-black md:text-5xl">
          Worth the second look.
        </h1>
        <p className="mx-auto mt-4 max-w-prose text-center text-base text-neutral-600">
          Funky anti-tarnish jewellery that stays worth the second look.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/shop"
            className="rounded-full bg-brand px-8 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            Shop the drop
          </Link>
        </div>
      </section>

      {/* Product photos are mixed portrait/landscape, so every tile is pinned to an
          explicit aspect box with object-cover to keep the row height even (no CLS). */}
      <section className="grid grid-cols-3 gap-4 px-4 pb-16 md:gap-8">
        <Image
          src="/brand/product-necklace-pink-heart.jpg"
          alt="Pink heart pendant necklace"
          width={1448}
          height={1086}
          className="aspect-square w-full rounded-md border border-neutral-200 object-cover"
        />
        <Image
          src="/brand/product-bracelet-gemstone.jpg"
          alt="Gemstone tennis bracelet"
          width={1448}
          height={1086}
          className="aspect-square w-full rounded-md border border-neutral-200 object-cover"
        />
        <Image
          src="/brand/product-ring-red-stone.jpg"
          alt="Gold ring with red stone"
          width={566}
          height={1085}
          className="aspect-square w-full rounded-md border border-neutral-200 object-cover"
        />
      </section>
    </div>
  );
}