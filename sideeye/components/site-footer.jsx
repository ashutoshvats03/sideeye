import Link from "next/link";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      ["Shop all", "/shop"],
      ["Track order", "/track"],
      ["Your bag", "/cart"],
      ["Your orders", "/account/orders"],
    ],
  },
  {
    title: "Help",
    links: [
      ["FAQ", "/faq"],
      ["Shipping", "/policies/shipping"],
      ["Returns & exchange", "/policies/returns"],
      ["Contact us", "/contact"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Privacy", "/policies/privacy"],
      ["Terms", "/policies/terms"],
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.2fr_1fr_1fr_1fr] sm:px-6">
        <div>
          <p className="font-display text-lg font-extrabold text-neutral-900">
            SideEye — worth the second look.
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            Funky anti-tarnish jewellery. Free shipping over Rs.999 · Cash on
            delivery.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={`Footer — ${col.title}`}>
            <p className="text-sm font-bold uppercase tracking-widest text-neutral-900">
              {col.title}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map(([label, href]) => (
                <li key={href + label}>
                  <Link
                    href={href}
                    className="text-neutral-600 underline-offset-4 hover:text-brand-red hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
