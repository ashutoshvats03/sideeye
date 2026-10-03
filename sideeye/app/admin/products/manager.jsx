"use client";

/**
 * Admin product manager: table + create/edit form.
 *
 * Validation authority is the server (`lib/product-input.js` via
 * `actions/admin-products.js`); this form only shapes the payload and shows
 * the server's error back. Money is converted rupees → integer paise with
 * string math so no float ever reaches the action.
 */

import { useState } from "react";
import { PRODUCT_VIBES } from "../../../lib/catalog.js";
import {
  createProduct,
  updateProduct,
  setProductActive,
  deleteProduct,
  uploadProductImage,
} from "../../../actions/admin-products.js";

/**
 * "199.99" → 19999 without float arithmetic. Returns null for blank.
 * @param {string} raw
 * @returns {number|null}
 */
export function parseRupeesToPaise(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const m = s.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return NaN;
  const rupees = Number(m[1]);
  const paisePart = (m[2] ?? "").padEnd(2, "0");
  return rupees * 100 + Number(paisePart);
}

/** 19999 → "199.99" for prefilling the form. */
export function formatPaiseToRupees(paise) {
  if (paise == null) return "";
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const emptyForm = (firstCategoryId) => ({
  name: "",
  slug: "",
  description: "",
  care: "",
  materials: "",
  price: "",
  mrp: "",
  stockQty: "0",
  categoryId: firstCategoryId ?? "",
  vibes: [],
  images: [],
  isActive: true,
});

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export default function ProductManager({ initialProducts, categories }) {
  const [products, setProducts] = useState(initialProducts);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyForm(categories[0]?.id));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description,
      care: p.care ?? "",
      materials: p.materials ?? "",
      price: formatPaiseToRupees(p.pricePaise),
      mrp: p.mrpPaise == null ? "" : formatPaiseToRupees(p.mrpPaise),
      stockQty: String(p.stockQty),
      categoryId: p.categoryId,
      vibes: p.vibes ?? [],
      images: p.images ?? [],
      isActive: p.isActive,
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm(categories[0]?.id));
    setMessage(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const pricePaise = parseRupeesToPaise(form.price);
    const mrpPaise = parseRupeesToPaise(form.mrp);
    if (!Number.isInteger(pricePaise)) {
      setBusy(false);
      setMessage({ ok: false, text: "Price must look like 199.99." });
      return;
    }
    if (form.mrp.trim() !== "" && !Number.isInteger(mrpPaise)) {
      setBusy(false);
      setMessage({ ok: false, text: "MRP must look like 249.99 or be blank." });
      return;
    }
    const stockQty = Number(form.stockQty);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      care: form.care.trim(),
      materials: form.materials.trim(),
      pricePaise,
      mrpPaise: form.mrp.trim() === "" ? null : mrpPaise,
      stockQty,
      categoryId: form.categoryId,
      vibes: form.vibes,
      tags: [],
      images: form.images,
      isActive: form.isActive,
    };

    const result = editingId
      ? await updateProduct({ id: editingId, ...payload })
      : await createProduct(payload);
    setBusy(false);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setMessage({
      ok: true,
      text: editingId ? "Product updated." : "Product created — it is live in the shop.",
    });
    cancelEdit();
    window.location.reload();
  }

  async function handleToggleActive(p) {
    setMessage(null);
    const result = await setProductActive({ id: p.id, isActive: !p.isActive });
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setProducts((list) =>
      list.map((x) => (x.id === p.id ? { ...x, isActive: !p.isActive } : x)),
    );
  }

  async function handleDelete(p) {
    if (!window.confirm(`Delete "${p.name}"? Order history keeps its snapshots.`)) return;
    setMessage(null);
    const result = await deleteProduct({ id: p.id });
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setProducts((list) => list.filter((x) => x.id !== p.id));
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadProductImage(fd);
    setUploading(false);
    e.target.value = "";
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    set((f) => ({ images: [...f.images, result.url] }));
  }

  function toggleVibe(v) {
    set((f) => ({
      vibes: f.vibes.includes(v) ? f.vibes.filter((x) => x !== v) : [...f.vibes, v],
    }));
  }

  const inputCls =
    "w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none";

  return (
    <div className="mt-6">
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded-2xl p-3 text-sm font-bold ${
            message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-neutral-200 p-4">
        <h2 className="font-display text-xl font-extrabold">
          {editingId ? "Edit product" : "New product"}
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-bold">Name</span>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                set({
                  name,
                  slug: editingId ? form.slug : slugify(name),
                });
              }}
              required
              maxLength={120}
            />
          </label>
          <label className="block text-sm">
            <span className="font-bold">Slug</span>
            <input
              className={inputCls}
              value={form.slug}
              onChange={(e) => set({ slug: e.target.value })}
              required
              maxLength={120}
            />
          </label>
        </div>

        <label className="mt-3 block text-sm">
          <span className="font-bold">Description</span>
          <textarea
            className={inputCls}
            rows={3}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            required
            maxLength={5000}
          />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-bold">Materials (optional)</span>
            <input
              className={inputCls}
              value={form.materials}
              onChange={(e) => set({ materials: e.target.value })}
              maxLength={2000}
            />
          </label>
          <label className="block text-sm">
            <span className="font-bold">Care (optional)</span>
            <input
              className={inputCls}
              value={form.care}
              onChange={(e) => set({ care: e.target.value })}
              maxLength={2000}
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-bold">Price (₹)</span>
            <input
              className={inputCls}
              value={form.price}
              onChange={(e) => set({ price: e.target.value })}
              inputMode="decimal"
              placeholder="199.99"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-bold">MRP (₹, optional)</span>
            <input
              className={inputCls}
              value={form.mrp}
              onChange={(e) => set({ mrp: e.target.value })}
              inputMode="decimal"
              placeholder="249.99"
            />
          </label>
          <label className="block text-sm">
            <span className="font-bold">Stock</span>
            <input
              className={inputCls}
              type="number"
              min={0}
              max={100000}
              step={1}
              value={form.stockQty}
              onChange={(e) => set({ stockQty: e.target.value })}
              required
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-bold">Category</span>
            <select
              className={inputCls}
              value={form.categoryId}
              onChange={(e) => set({ categoryId: e.target.value })}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm">
            <span className="font-bold">Vibes</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {PRODUCT_VIBES.map((v) => (
                <label
                  key={v}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold ${
                    form.vibes.includes(v)
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.vibes.includes(v)}
                    onChange={() => toggleVibe(v)}
                  />
                  {v}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm">
          <span className="font-bold">Images ({form.images.length})</span>
          {form.images.length > 0 && (
            <ul className="mt-1 space-y-1">
              {form.images.map((url) => (
                <li key={url} className="flex items-center justify-between gap-2 text-xs">
                  <code className="truncate rounded bg-neutral-100 px-2 py-1">{url}</code>
                  <button
                    type="button"
                    className="font-bold text-red-700 underline"
                    onClick={() =>
                      set({ images: form.images.filter((x) => x !== url) })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="mt-2 block">
            <span className="sr-only">Upload an image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={uploading}
              className="text-xs"
            />
            {uploading && <span className="ml-2 text-xs">Uploading…</span>}
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set({ isActive: e.target.checked })}
          />
          Visible in shop
        </label>

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : editingId ? "Save changes" : "Create product"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-bold"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="mt-6 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
        {products.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-bold">
                {p.name}{" "}
                {!p.isActive && (
                  <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-500">
                    hidden
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {p.category?.name} · {p.stockQty} in stock
              </p>
            </div>
            <div className="flex shrink-0 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => startEdit(p)}
                className="rounded-full border border-neutral-300 px-3 py-1"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleToggleActive(p)}
                className="rounded-full border border-neutral-300 px-3 py-1"
              >
                {p.isActive ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(p)}
                className="rounded-full border border-red-200 px-3 py-1 text-red-700"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {products.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-neutral-500">
            No products yet — create the first one above.
          </li>
        )}
      </ul>
    </div>
  );
}
