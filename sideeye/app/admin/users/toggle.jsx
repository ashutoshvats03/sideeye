"use client";

/**
 * Activate / deactivate toggle for one user row.
 */

import { useState } from "react";
import { setUserActive } from "../../../actions/admin-ops.js";

export default function UserToggle({ id, isActive: initial }) {
  const [isActive, setIsActive] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const result = await setUserActive({ id, isActive: !isActive });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setIsActive(!isActive);
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {error && (
        <span role="alert" className="text-xs font-bold text-red-700">
          {error}
        </span>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={toggle}
        className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-bold"
      >
        {busy ? "…" : isActive ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}
