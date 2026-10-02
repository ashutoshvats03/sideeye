export const metadata = {
  title: "Privacy policy — SideEye",
  description: "What data SideEye collects and why.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-red">
        Policies
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
        Privacy policy
      </h1>
      <div className="mt-6 space-y-4 text-neutral-700">
        <p>
          <span className="font-bold">What we collect.</span> Your name, email
          and profile photo from Google sign-in; delivery addresses you save;
          order history; and reviews you write. Your bag lives in your own
          browser until checkout.
        </p>
        <p>
          <span className="font-bold">Why.</span> To deliver orders, confirm
          them over call if needed, prevent fraud, and show you relevant
          pieces. Nothing else.
        </p>
        <p>
          <span className="font-bold">What we never do.</span> We never sell
          your data, never log card details (v1 is cash on delivery anyway),
          and order tracking by phone number only ever shows your own order.
        </p>
        <p>
          <span className="font-bold">Deletion.</span> Email hello@sideeye.in
          from your account email and we will delete your account and personal
          data, keeping only the order records the law requires us to retain.
        </p>
      </div>
    </div>
  );
}
