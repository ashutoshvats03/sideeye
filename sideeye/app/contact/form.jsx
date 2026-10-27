"use client";

import { useState } from "react";
import { validateContactInput } from "../../lib/contact-input.js";

/**
 * Contact form — validates in the browser, confirms identically for everyone,
 * and hands the composed message to the shopper's own mail app via `mailto:`.
 * No account lookup happens anywhere in this flow, so a submission can never
 * reveal whether an email is registered (Plan 06 review focus).
 */
export default function ContactForm() {
  const [fields, setFields] = useState({ name: "", email: "", orderNumber: "", message: "" });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(null);

  function set(key) {
    return (e) => {
      setFields((f) => ({ ...f, [key]: e.target.value }));
      setError(null);
    };
  }

  function submit(e) {
    e.preventDefault();
    const checked = validateContactInput(fields);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    const { name, email, orderNumber, message } = checked.data;
    const subject = encodeURIComponent(
      `SideEye query from ${name}${orderNumber ? ` · ${orderNumber}` : ""}`,
    );
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    const href = `mailto:hello@sideeye.in?subject=${subject}&body=${body}`;
    setSent({ href });
    window.location.href = href;
  }

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-3xl border-2 border-brand bg-surface p-6 text-center"
      >
        <p className="font-display text-2xl font-bold">Message ready in your mail app.</p>
        <p className="mt-2 text-neutral-700">
          We reply within one working day, Monday to Saturday. If your mail app
          did not open, use the button below.
        </p>
        <a
          href={sent.href}
          className="mt-4 inline-block rounded-2xl bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        >
          Open my mail app
        </a>
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-2xl border-2 border-neutral-200 px-4 py-3 focus:border-brand focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red";

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-brand-dark">
          {error}
        </p>
      ) : null}
      <div>
        <label htmlFor="contact-name" className="text-sm font-bold">Name</label>
        <input
          id="contact-name"
          type="text"
          autoComplete="name"
          value={fields.name}
          onChange={set("name")}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="text-sm font-bold">Email</label>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          value={fields.email}
          onChange={set("email")}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="contact-order" className="text-sm font-bold">
          Order number <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <input
          id="contact-order"
          type="text"
          inputMode="text"
          placeholder="SE-XXXXXXXX"
          value={fields.orderNumber}
          onChange={set("orderNumber")}
          aria-describedby="contact-order-hint"
          className={inputClass}
        />
        <p id="contact-order-hint" className="mt-1 text-xs text-neutral-500">
          Looks like SE-XXXXXXXX. Skip this for non-order queries.
        </p>
      </div>
      <div>
        <label htmlFor="contact-message" className="text-sm font-bold">Message</label>
        <textarea
          id="contact-message"
          rows={5}
          value={fields.message}
          onChange={set("message")}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-2xl bg-brand px-6 py-4 font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
      >
        Send via my mail app
      </button>
    </form>
  );
}
