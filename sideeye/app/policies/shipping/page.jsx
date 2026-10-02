export const metadata = {
  title: "Shipping policy — SideEye",
  description: "Flat Rs.49 shipping, free above Rs.999. COD available.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-red">
        Policies
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
        Shipping policy
      </h1>
      <div className="mt-6 space-y-4 text-neutral-700">
        <p>
          <span className="font-bold">Charges.</span> Flat Rs.49 per order.
          Shipping is free on orders above Rs.999.
        </p>
        <p>
          <span className="font-bold">Dispatch.</span> Orders leave our studio
          in 2–4 working days. You get tracking as soon as the courier picks up.
        </p>
        <p>
          <span className="font-bold">Delivery.</span> Most pincodes are served
          in 3–7 working days after dispatch. Remote pincodes can take a little
          longer — the track page always shows the latest status.
        </p>
        <p>
          <span className="font-bold">COD.</span> Cash on delivery is available
          everywhere we ship. Keep the exact amount ready for the courier.
        </p>
        <p>
          <span className="font-bold">Wrong address?</span> Contact us within 24
          hours of ordering and we will try to fix it before dispatch. Once
          shipped, the address cannot be changed.
        </p>
      </div>
    </div>
  );
}
