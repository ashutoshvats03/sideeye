export const metadata = {
  title: "Terms of service — SideEye",
  description: "The rules for shopping at SideEye.",
};

export default function TermsPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-red">
        Policies
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
        Terms of service
      </h1>
      <div className="mt-6 space-y-4 text-neutral-700">
        <p>
          <span className="font-bold">Accounts.</span> You must sign in with
          Google to place an order. You are responsible for keeping your
          account and addresses accurate.
        </p>
        <p>
          <span className="font-bold">Prices.</span> All prices are in rupees,
          inclusive of taxes. Discounts apply only through valid coupon codes
          at checkout — totals are always recomputed on our server, so
          tampered carts cannot change what you pay.
        </p>
        <p>
          <span className="font-bold">COD.</span> Cash-on-delivery orders that
          are repeatedly refused may lead to COD being disabled for that
          account.
        </p>
        <p>
          <span className="font-bold">Reviews.</span> Only verified buyers may
          review, one review per piece. We publish honest reviews and remove
          abuse, spam and personal data.
        </p>
        <p>
          <span className="font-bold">Fair use.</span> Coupons are per the
          stated limits; abuse (fake accounts, bulk misuse) leads to order
          cancellation and account suspension.
        </p>
      </div>
    </div>
  );
}
