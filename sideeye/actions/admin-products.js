"use server";

/**
 * Admin product mutations.
 *
 * Every action re-checks `role === "admin"` server-side via the DB-backed
 * session user. Hiding buttons in the UI is not the control: a non-admin
 * POSTing straight at any of these actions gets `{ ok: false }`, never a
 * write (Plan 05 Review Focus).
 *
 * Validation shape lives in `lib/product-input.js` (unit tested); existence
 * checks (category, slug uniqueness) live here against Prisma.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "../lib/prisma.js";
import { getCurrentUser } from "../lib/guards.js";
import { isAdminRole } from "../lib/roles.js";
import { validateProductInput } from "../lib/product-input.js";
import { saveImage, MAX_IMAGE_BYTES } from "../lib/storage.js";

async function requireAdminAction() {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) {
    return { error: "Forbidden." };
  }
  return { user };
}

const idSchema = z.object({ id: z.string().trim().min(1) });

const activeSchema = z.object({
  id: z.string().trim().min(1),
  isActive: z.boolean(),
});

/**
 * @param {object} input product fields (see lib/product-input.js)
 * @returns {Promise<{ok: true, id: string} | {ok: false, error: string}>}
 */
export async function createProduct(input) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const checked = validateProductInput(input);
  if (!checked.ok) return { ok: false, error: checked.error };
  const data = checked.data;

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true },
  });
  if (!category) return { ok: false, error: "Category does not exist." };

  const clash = await prisma.product.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (clash) return { ok: false, error: "That slug is already in use." };

  const created = await prisma.product.create({ data });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: true, id: created.id };
}

/**
 * @param {{id: string} & object} input
 * @returns {Promise<{ok: true} | {ok: false, error: string}>}
 */
export async function updateProduct(input) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const { id, ...rest } = input ?? {};
  const idParsed = idSchema.safeParse({ id });
  if (!idParsed.success) return { ok: false, error: "Invalid product." };

  const checked = validateProductInput(rest);
  if (!checked.ok) return { ok: false, error: checked.error };
  const data = checked.data;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Product not found." };

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true },
  });
  if (!category) return { ok: false, error: "Category does not exist." };

  if (data.slug !== existing.slug) {
    const clash = await prisma.product.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (clash) return { ok: false, error: "That slug is already in use." };
  }

  await prisma.product.update({ where: { id }, data });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/product/${existing.slug}`);
  revalidatePath(`/product/${data.slug}`);
  return { ok: true };
}

/**
 * Activate or deactivate a product. Deactivated products 404 on the
 * storefront like missing ones (see lib/products.js).
 */
export async function setProductActive(input) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const parsed = activeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid product." };

  const existing = await prisma.product.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, slug: true },
  });
  if (!existing) return { ok: false, error: "Product not found." };

  await prisma.product.update({
    where: { id: existing.id },
    data: { isActive: parsed.data.isActive },
  });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/product/${existing.slug}`);
  return { ok: true };
}

/**
 * Hard-delete a product. Safe for history: `OrderItem.productId` is
 * `onDelete: SetNull` and every order carries name/price/image snapshots,
 * so past orders keep rendering after the row is gone.
 */
export async function deleteProduct(input) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid product." };

  const existing = await prisma.product.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, slug: true },
  });
  if (!existing) return { ok: false, error: "Product not found." };

  await prisma.product.delete({ where: { id: existing.id } });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: true };
}

/**
 * Store one uploaded product image. Accepts `FormData` with a `file` entry
 * (from the admin product form's `<input type="file">`).
 *
 * @param {FormData} formData
 * @returns {Promise<{ok: true, url: string} | {ok: false, error: string}>}
 */
export async function uploadProductImage(formData) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const file = formData?.get?.("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, error: "No file selected." };
  }
  if (!String(file.type || "").startsWith("image/")) {
    return { ok: false, error: "Only image files can be uploaded." };
  }
  if (file.size <= 0) return { ok: false, error: "That file is empty." };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image is too large (max 5MB)." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await saveImage(buffer, file.name || "upload.png");
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: err?.message || "Upload failed." };
  }
}
