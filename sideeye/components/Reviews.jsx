"use client";

import { useState } from "react";

/**
 * Approved reviews + the write-a-review form.
 *
 * `reviews` arrives from the server already filtered to `isApproved: true` and already
 * stripped of the reviewer's id and email (see `getApprovedReviews` in lib/products.js) —
 * the browser is never trusted to do either job.
 *
 * Submitting POSTs to /api/reviews. A new review is stored with `isApproved: false` and
 * will not appear in this list until an admin approves it, so the form says so plainly
 * rather than optimistically pretending the review is live.
 */
export default function Reviews({ productId, reviews, summary, canReview, isSignedIn }) {
  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="border-t border-neutral-200 pt-12 scroll-mt-24">
      <h2 id="reviews-heading" className="font-display text-3xl font-bold">
        Reviews
      </h2>

      <RatingSummary summary={summary} />

      {reviews.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-surface px-6 py-8 text-center text-neutral-600">
          No reviews yet. Be the first to say how it wears.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-neutral-200 p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Stars rating={review.rating} />
                <p className="font-bold">{review.user.name ?? "SideEye shopper"}</p>
              </div>
              {review.text ? (
                <p className="mt-3 whitespace-pre-line text-neutral-700">{review.text}</p>
              ) : (
                <p className="mt-3 text-sm italic text-neutral-500">
                  Rated {review.rating} out of 5.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canReview ? (
        <ReviewForm productId={productId} />
      ) : (
        <p className="mt-8 text-sm text-neutral-600">
          {isSignedIn
            ? "Only buyers of this piece can review it."
            : "Sign in to review this piece."}
        </p>
      )}
    </section>
  );
}

function RatingSummary({ summary }) {
  if (!summary || summary.count === 0) {
    return (
      <p className="mt-3 text-neutral-600">
        Not rated yet.
      </p>
    );
  }

  return (
    <p className="mt-3 flex items-center gap-2">
      <Stars rating={summary.avg} />
      <span className="font-bold">{summary.avg.toFixed(1)}</span>
      <span className="text-neutral-600">
        ({summary.count} {summary.count === 1 ? "review" : "reviews"})
      </span>
    </p>
  );
}

function Stars({ rating }) {
  const rounded = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rounded ? "text-gold" : "text-neutral-300"}>
          &#9733;
        </span>
      ))}
    </span>
  );
}

function ReviewForm({ productId }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, text }),
      });

      if (response.status === 401) {
        setStatus({ ok: false, message: "Please sign in before reviewing." });
        return;
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({ ok: false, message: payload.error ?? "Could not save your review." });
        return;
      }

      setText("");
      setStatus({
        ok: true,
        message: "Thanks! Your review is waiting for approval.",
      });
    } catch {
      setStatus({ ok: false, message: "Could not save your review. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 max-w-xl space-y-4">
      <h3 className="font-display text-xl font-bold">Write a review</h3>

      <fieldset>
        <legend className="text-sm font-semibold">Your rating</legend>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-pressed={rating === star}
              aria-label={`${star} out of 5`}
              className={`text-3xl leading-none transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red ${
                star <= rating ? "text-gold" : "text-neutral-300"
              }`}
            >
              &#9733;
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="review-text" className="text-sm font-semibold">
          Your thoughts (optional)
        </label>
        <textarea
          id="review-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={2000}
          rows={4}
          className="mt-2 w-full rounded-2xl border-2 border-neutral-200 p-3 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-0 focus-visible:outline-brand-red"
        />
        <p className="mt-1 text-xs text-neutral-500">
          {text.length}/2000
        </p>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="rounded-2xl bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-dark disabled:opacity-60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
      >
        {busy ? "Sending…" : "Submit review"}
      </button>

      {status ? (
        <p
          role="status"
          className={`text-sm font-semibold ${
            status.ok ? "text-brand-dark" : "text-red-700"
          }`}
        >
          {status.message}
        </p>
      ) : null}

      <p className="text-xs text-neutral-500">
        Reviews show up once they have been approved, so you might not see yours straight
        away.
      </p>
    </form>
  );
}