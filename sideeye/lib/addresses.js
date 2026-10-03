/**
 * Ownership-scoped address writes.
 *
 * Every function takes `(db, userId, ...)` and scopes ALL queries by that
 * `userId`, so a guessed address id belonging to someone else is refused
 * rather than touched. Deleting an address never touches an order — orders
 * render from `addressSnapshot`, never from this table.
 *
 * `db` is the Prisma client (passed in so tests run these against the real
 * Postgres without booting Auth.js — the `lib/users.js` pattern).
 */

import { isSameAddress } from "./address-match.js";

function notFound() {
  return { ok: false, error: "Address not found." };
}

/**
 * Create a saved address. New rows are never the default — becoming the
 * default is an explicit act via `setDefaultAddressForUser`.
 */
export async function createAddressForUser(db, userId, data) {
  const address = await db.address.create({
    data: { ...data, userId, isDefault: false },
  });
  return { ok: true, address };
}

/**
 * Save a checkout-typed address to the user's book, unless an identical row
 * already exists. Autosaved rows are never the default (explicit-defaults
 * ruling) and carry no label. Returns `{ saved: true/false }` — a save that
 * finds a duplicate is a quiet no-op, not an error.
 */
export async function maybeSaveAddressForUser(db, userId, fields) {
  const existing = await db.address.findMany({
    where: { userId },
    select: {
      name: true,
      phone: true,
      line1: true,
      line2: true,
      city: true,
      state: true,
      pincode: true,
    },
  });
  if (existing.some((row) => isSameAddress(row, fields))) {
    return { saved: false };
  }
  await createAddressForUser(db, userId, {
    label: null,
    name: fields.name,
    phone: fields.phone,
    line1: fields.line1,
    line2: fields.line2 ?? "",
    city: fields.city,
    state: fields.state,
    pincode: fields.pincode,
  });
  return { saved: true };
}

/** Edit an owned address. `isDefault` cannot be changed here. */
export async function updateAddressForUser(db, userId, addressId, data) {
  const owned = await db.address.findFirst({ where: { id: addressId, userId } });
  if (!owned) return notFound();
  const { isDefault: _ignored, ...fields } = data;
  const address = await db.address.update({ where: { id: addressId }, data: fields });
  return { ok: true, address };
}

/** Delete an owned address. Orders are untouched (they use snapshots). */
export async function deleteAddressForUser(db, userId, addressId) {
  const owned = await db.address.findFirst({ where: { id: addressId, userId } });
  if (!owned) return notFound();
  await db.address.delete({ where: { id: addressId } });
  return { ok: true };
}

/**
 * Make one owned address the default. A single transaction clears the user's
 * other defaults and sets the target, so exactly one default survives even
 * if two requests race.
 */
export async function setDefaultAddressForUser(db, userId, addressId) {
  const owned = await db.address.findFirst({ where: { id: addressId, userId } });
  if (!owned) return notFound();
  await db.$transaction([
    db.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
    db.address.update({ where: { id: addressId }, data: { isDefault: true } }),
  ]);
  return { ok: true };
}
