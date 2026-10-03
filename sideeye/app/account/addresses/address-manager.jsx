"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../../../actions/addresses.js";

const EMPTY = { label: "", name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

function AddressForm({ initial, submitLabel, onSubmit, onCancel, saving, error }) {
  const [fields, setFields] = useState({ ...EMPTY, ...initial });
  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(fields);
      }}
      className="space-y-3 rounded-2xl border border-neutral-200 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="addr-label" className="text-sm font-bold">
            Label <span className="font-normal text-neutral-500">(e.g. Home)</span>
          </label>
          <input id="addr-label" value={fields.label} onChange={set("label")} maxLength={30} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2" />
        </div>
        <div>
          <label htmlFor="addr-name" className="text-sm font-bold">Full name</label>
          <input id="addr-name" value={fields.name} onChange={set("name")} required maxLength={80} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2" />
        </div>
        <div>
          <label htmlFor="addr-phone" className="text-sm font-bold">Phone</label>
          <input id="addr-phone" value={fields.phone} onChange={set("phone")} required inputMode="numeric" placeholder="10-digit mobile" className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2" />
        </div>
        <div>
          <label htmlFor="addr-pincode" className="text-sm font-bold">Pincode</label>
          <input id="addr-pincode" value={fields.pincode} onChange={set("pincode")} required inputMode="numeric" placeholder="6 digits" className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2" />
        </div>
      </div>
      <div>
        <label htmlFor="addr-line1" className="text-sm font-bold">Address</label>
        <input id="addr-line1" value={fields.line1} onChange={set("line1")} required maxLength={120} placeholder="Flat, street, landmark" className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2" />
      </div>
      <div>
        <label htmlFor="addr-line2" className="text-sm font-bold">
          Address line 2 <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <input id="addr-line2" value={fields.line2} onChange={set("line2")} maxLength={120} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="addr-city" className="text-sm font-bold">City</label>
          <input id="addr-city" value={fields.city} onChange={set("city")} required maxLength={60} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2" />
        </div>
        <div>
          <label htmlFor="addr-state" className="text-sm font-bold">State</label>
          <input id="addr-state" value={fields.state} onChange={set("state")} required maxLength={60} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2" />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="rounded-2xl bg-brand px-6 py-2.5 font-bold text-white transition hover:bg-brand-dark disabled:opacity-60">
          {saving ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-2xl border border-neutral-300 px-6 py-2.5 font-bold">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AddressManager({ initial }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function run(action, payload, done) {
    setError("");
    setSaving(true);
    const res = await action(payload);
    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Something went wrong. Try again.");
      return;
    }
    done();
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-4">
      {error && !showAdd && !editingId ? (
        <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      {initial.length === 0 && !showAdd ? (
        <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-neutral-200">
          <p className="text-lg font-semibold">No saved addresses yet.</p>
          <p className="mt-2 text-sm text-neutral-600">Save one to speed up checkout.</p>
        </div>
      ) : null}

      <ul className="space-y-4">
        {initial.map((a) => (
          <li key={a.id} className="rounded-3xl bg-surface p-6 ring-1 ring-neutral-200">
            {editingId === a.id ? (
              <AddressForm
                initial={a}
                submitLabel="Save address"
                saving={saving}
                error={error}
                onCancel={() => { setEditingId(null); setError(""); }}
                onSubmit={(fields) => run(updateAddress, { ...fields, addressId: a.id }, () => setEditingId(null))}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-bold">
                      {a.label ? `${a.label} — ` : ""}{a.name}
                    </p>
                    <p className="mt-1">{[a.line1, a.line2].filter(Boolean).join(", ")}</p>
                    <p>{[a.city, a.state, a.pincode].filter(Boolean).join(" ")}</p>
                    <p className="mt-1 text-neutral-600">Phone: {a.phone}</p>
                  </div>
                  {a.isDefault ? (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                      Default
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!a.isDefault ? (
                    <button
                      type="button"
                      onClick={() => run(setDefaultAddress, { addressId: a.id }, () => {})}
                      className="rounded-xl border border-neutral-300 px-4 py-1.5 text-sm font-bold"
                    >
                      Set default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => { setEditingId(a.id); setError(""); }}
                    className="rounded-xl border border-neutral-300 px-4 py-1.5 text-sm font-bold"
                  >
                    Edit
                  </button>
                  {confirmingId === a.id ? (
                    <button
                      type="button"
                      onClick={() => run(deleteAddress, { addressId: a.id }, () => setConfirmingId(null))}
                      className="rounded-xl bg-red-600 px-4 py-1.5 text-sm font-bold text-white"
                    >
                      Confirm delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(a.id)}
                      className="rounded-xl border-2 border-red-600 px-4 py-1.5 text-sm font-bold text-red-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {showAdd ? (
        <AddressForm
          initial={EMPTY}
          submitLabel="Save address"
          saving={saving}
          error={error}
          onCancel={() => { setShowAdd(false); setError(""); }}
          onSubmit={(fields) => run(createAddress, fields, () => setShowAdd(false))}
        />
      ) : (
        <button
          type="button"
          onClick={() => { setShowAdd(true); setError(""); }}
          className="w-full rounded-3xl border-2 border-dashed border-neutral-300 p-6 font-bold text-neutral-600 transition hover:border-brand hover:text-brand"
        >
          + Add a new address
        </button>
      )}
    </div>
  );
}
