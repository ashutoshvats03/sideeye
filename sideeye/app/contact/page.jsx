import ContactForm from "./form.jsx";

export const metadata = {
  title: "Contact — SideEye",
  description: "Talk to the SideEye team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-red">
        Say hi
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
        Contact us
      </h1>
      <p className="mt-4 text-neutral-700">
        Order issue, sizing doubt, bulk or gifting query — we reply within one
        working day.
      </p>

      <div className="mt-6">
        <ContactForm />
      </div>

      <ul className="mt-6 space-y-4">
        <li className="rounded-3xl bg-surface p-5 ring-1 ring-neutral-200">
          <p className="font-bold">Prefer DMs?</p>
          <p className="mt-1 text-neutral-700">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-brand-dark underline"
            >
              Instagram
            </a>{" "}
            is fastest for order queries — send your order number (SE-XXXXXXXX).{" "}
            <a
              href="https://wa.me"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-brand-dark underline"
            >
              WhatsApp
            </a>{" "}
            works too, Monday to Saturday, 10am to 7pm IST.
          </p>
        </li>
        <li className="rounded-3xl bg-surface p-5 ring-1 ring-neutral-200">
          <p className="font-bold">Email</p>
          <p className="mt-1 text-neutral-700">hello@sideeye.in</p>
        </li>
        <li className="rounded-3xl bg-surface p-5 ring-1 ring-neutral-200">
          <p className="font-bold">Hours</p>
          <p className="mt-1 text-neutral-700">
            Monday to Saturday, 10am to 7pm IST.
          </p>
        </li>
      </ul>
      <p className="mt-6 text-sm text-neutral-600">
        To track an order yourself you do not need us — use the{" "}
        <a href="/track" className="font-bold text-brand-dark underline">
          track page
        </a>{" "}
        with your order number and mobile number.
      </p>
    </div>
  );
}
