export const metadata = {
  title: "Returns & exchange — SideEye",
  description: "7-day easy returns on unworn pieces.",
};

export default function ReturnsPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-red">
        Policies
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
        Returns &amp; exchange
      </h1>
      <div className="mt-6 space-y-4 text-neutral-700">
        <p>
          <span className="font-bold">7-day window.</span> Unworn pieces in
          original condition can be returned within 7 days of delivery. For
          hygiene reasons, worn pieces cannot be returned.
        </p>
        <p>
          <span className="font-bold">How to start.</span> Email
          hello@sideeye.in with your order number and a photo of the piece.
          We arrange a doorstep pickup wherever possible.
        </p>
        <p>
          <span className="font-bold">Refunds.</span> COD orders are refunded by
          bank transfer or UPI within 5–7 working days of a successful pickup.
          Shipping charges are non-refundable.
        </p>
        <p>
          <span className="font-bold">Damaged or wrong item?</span> Tell us
          within 48 hours of delivery with photos and we will replace it free —
          no return shipping on you.
        </p>
      </div>
    </div>
  );
}
