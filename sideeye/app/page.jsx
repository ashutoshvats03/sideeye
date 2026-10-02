import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <section className="bg-brand px-4 py-10 text-center text-white">
        <Image
          src="/brand/logo-lockup-red.png"
          alt="SideEye — Worth the second look"
          width={720}
          height={960}
          priority
          className="mx-auto w-64 rounded-lg md:w-80"
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

      <section className="grid grid-cols-3 gap-4 px-4 pb-16 md:gap-8">
        <Image
          src="/brand/product-necklace-pink-heart.jpg"
          alt="Pink heart pendant necklace"
          width={1440}
          height={1080}
          className="w-full rounded-md border border-neutral-200"
        />
        <Image
          src="/brand/product-bracelet-gemstone.jpg"
          alt="Gemstone tennis bracelet"
          width={1440}
          height={1080}
          className="w-full rounded-md border border-neutral-200"
        />
        <Image
          src="/brand/product-ring-red-stone.jpg"
          alt="Gold ring with red stone"
          width={576}
          height={1152}
          className="w-full rounded-md border border-neutral-200"
        />
      </section>
    </main>
  );
}