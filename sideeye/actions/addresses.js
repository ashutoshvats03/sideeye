"use server";

/**
 * Customer address-book actions.
 *
 * Thin gates (session + zod); the database rules live in `lib/addresses.js`
 * and are proven by DB-backed tests there. Every write is scoped to the
 * signed-in user's own rows.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "../lib/prisma.js";
import { getCurrentUser } from "../lib/guards.js";
import { validateAddressInput } from "../lib/address-input.js";
import {
  createAddressForUser,
  updateAddressForUser,
  deleteAddressForUser,
  setDefaultAddressForUser,
} from "../lib/addresses.js";

const idSchema = z.object({ addressId: z.string().trim().min(1) });

async function gate() {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  return { user };
}

function revalidateAddresses() {
  revalidatePath("/account/addresses");
}

export async function createAddress(input) {
  const { user, error } = await gate();
  if (error) return { ok: false, error };
  const checked = validateAddressInput(input);
  if (!checked.ok) return { ok: false, error: checked.error };
  const res = await createAddressForUser(prisma, user.id, checked.data);
  if (res.ok) revalidateAddresses();
  return res;
}

export async function updateAddress(input) {
  const { user, error } = await gate();
  if (error) return { ok: false, error };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid address." };
  const checked = validateAddressInput(input);
  if (!checked.ok) return { ok: false, error: checked.error };
  const res = await updateAddressForUser(prisma, user.id, parsed.data.addressId, checked.data);
  if (res.ok) revalidateAddresses();
  return res;
}

export async function deleteAddress(input) {
  const { user, error } = await gate();
  if (error) return { ok: false, error };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid address." };
  const res = await deleteAddressForUser(prisma, user.id, parsed.data.addressId);
  if (res.ok) revalidateAddresses();
  return res;
}

export async function setDefaultAddress(input) {
  const { user, error } = await gate();
  if (error) return { ok: false, error };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid address." };
  const res = await setDefaultAddressForUser(prisma, user.id, parsed.data.addressId);
  if (res.ok) revalidateAddresses();
  return res;
}
