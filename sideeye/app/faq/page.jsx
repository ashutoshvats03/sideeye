import Link from "next/link";

export const metadata = {
  title: "FAQ — SideEye",
  description: "Answers about tarnish, shipping, COD, returns and tracking.",
};

const FAQS = [
  {
    q: "Will SideEye jewellery tarnish?",
    a: "Our pieces are anti-tarnish coated to resist fading from sweat, water splashes and everyday wear. They are not solid gold, so keep them away from perfume and pools and wipe them with a soft dry cloth to keep the shine longest.",
  },
  {
    q: "How do I pay? Is COD available?",
    a: "Yes — cash on delivery is available on every order. Pay the courier in cash when your pieces arrive. Online prepaid payments are coming soon.",
  },
  {
    q: "How much is shipping, and how long does it take?",
    a: "Shipping is a flat Rs.49, and free on orders above Rs.999. Orders dispatch in 2–4 working days. See the shipping policy for the full picture.",
  },
  {
    q: "How do I track my order?",
    a: "Open the track page, enter your order number (it looks like SE-XXXXXXXX) plus the mobile number you ordered with, and you will see exactly where your order stands.",
  },
  {
    q: "Can I cancel my order?",
    a: "Yes, while it is still pending or confirmed — open your orders page and hit Cancel. Once it is packed, cancellation is no longer possible, but returns still apply after delivery.",
  },
  {
    q: "What is your return policy?",
    a: "7-day easy returns on unworn pieces in original condition. Refunds for COD orders go by bank transfer/UPI within 5–7 working days of pickup. Read the full returns policy for details.",
  },
  {
    q: "Do you have a coupon for me?",
    a: "New drops and coupon codes are announced on the home page and at checkout. Type your code into the coupon box on the cart page to see the discount before you pay.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-red">
        Help
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
        Frequently asked questions
      </h1>
      <div className="mt-6 space-y-3">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border-2 border-neutral-200 bg-white"
          >
            <summary className="cursor-pointer list-none px-5 py-4 font-semibold marker:hidden">
              {item.q}
            </summary>
            <p className="border-t-2 border-neutral-100 px-5 py-4 text-neutral-700">
              {item.a}
            </p>
          </details>
        ))}
      </div>
      <p className="mt-8 text-neutral-600">
        Still stuck?{" "}
        <Link href="/contact" className="font-bold text-brand-dark underline">
          Talk to us
        </Link>
        .
      </p>
    </div>
  );
}
