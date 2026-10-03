"use client";

/**
 * Approve / reject buttons for one pending review. The row removes itself on
 * success so the queue visibly drains.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setReviewApproval } from "../../../actions/admin-ops.js";

export default function ReviewButtons({ id }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  async function decide(isApproved) {
    setBusy(true);
    setError(null);
    const result = await setReviewApproval({ id, isApproved });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(isApproved ? "Approved — now visible on the product page." : "Rejected.");
    router.refresh();
  }

  if (done) {
    return <p className="mt-2 text-xs font-bold text-green-800">{done}</p>;
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => decide(true)}
        className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => decide(false)}
        className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
      >
        Reject
      </button>
      {error && (
        <span role="alert" className="text-xs font-bold text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
