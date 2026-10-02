export const metadata = {
  title: "About — SideEye",
  description: "Funky anti-tarnish jewellery. Worth the second look.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-red">
        Our story
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
        Jewellery that gets you a second look.
      </h1>
      <div className="mt-6 space-y-4 text-neutral-700">
        <p>
          SideEye started with a simple frustration: jewellery that looked
          amazing on day one and dull by day thirty. Tarnish, fading, green
          skin — no thanks.
        </p>
        <p>
          So we make funky, anti-tarnish pieces built for everyday drama:
          chunky rings, statement hoops, layered necklaces and arm candy that
          survives sweat, rain and your busiest weeks without losing its shine.
        </p>
        <p>
          Every piece is picked to be affordable, giftable and unapologetically
          extra. If someone does a double-take, that means we did our job.
        </p>
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Anti-tarnish", "Coated to resist fading, sweat and water splashes."],
          ["COD available", "Pay cash when your order reaches your door."],
          ["Free ship Rs.999+", "Flat Rs.49 shipping, free above Rs.999."],
        ].map(([title, text]) => (
          <li
            key={title}
            className="rounded-3xl bg-surface p-5 ring-1 ring-neutral-200"
          >
            <p className="font-display font-bold">{title}</p>
            <p className="mt-1 text-sm text-neutral-600">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
