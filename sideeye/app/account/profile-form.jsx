"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "../../actions/profile.js";

/**
 * Edit-in-place profile form. Hidden behind an Edit toggle; email is never
 * shown as an input because it is the read-only Google identity.
 */
export default function ProfileForm({ initialName, initialDob, initialPhone }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [dob, setDob] = useState(initialDob);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await updateProfile({ name, dob, phone });
    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Could not save. Try again.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setError("");
          setEditing(true);
        }}
        className="mt-6 rounded-2xl border-2 border-brand px-6 py-2.5 font-bold text-brand transition hover:bg-brand hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
      >
        Edit profile
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-neutral-200 p-4">
      <div>
        <label htmlFor="profile-name" className="text-sm font-bold">
          Name
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-dob" className="text-sm font-bold">
            Birthday <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          <input
            id="profile-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="profile-phone" className="text-sm font-bold">
            Phone <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          <input
            id="profile-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            placeholder="10-digit mobile"
            className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-brand px-6 py-2.5 font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setName(initialName);
            setDob(initialDob);
            setPhone(initialPhone);
            setError("");
            setEditing(false);
          }}
          className="rounded-2xl border border-neutral-300 px-6 py-2.5 font-bold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
