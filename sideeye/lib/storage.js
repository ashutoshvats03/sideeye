/**
 * Product image storage — the single seam for where bytes live.
 *
 * v1 writes to `public/uploads` on local disk (VPS-first decision, Plan 05).
 * Nothing else in the app learns the directory layout: callers use only
 * `saveImage(buffer, originalName)` → public URL and `deleteImage(url)`.
 * The Cloudflare R2 move later is a change to this one file (plus an
 * `images.remotePatterns` entry in `next.config.js`).
 *
 * Security: filenames are sanitised (no directories, no traversal), only image
 * extensions are accepted, and `deleteImage` refuses any URL outside `/uploads/`.
 */

import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { randomBytes } from "node:crypto";

/** Image extensions we accept from admin uploads. Lowercase, with dot. */
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

/** Sane per-file cap: 5 MiB. Next's server-action body limit (1 MiB default) is
 *  configured separately in `next.config.js` when uploads need it. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Strip a client-supplied filename down to a safe `base.ext`.
 *
 * @param {unknown} original e.g. `../../etc/passwd.PNG` or `My Photo.JPG`
 * @returns {string} e.g. `my-photo.jpg`
 * @throws {Error} when the extension is not an allowed image type
 */
export function sanitizeImageName(original) {
  if (typeof original !== "string" || original.length === 0) {
    throw new Error("Image filename is required.");
  }
  const bare = basename(original);
  const ext = extname(bare).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported image type "${ext || "(none)"}".`);
  }
  const stem = bare.slice(0, bare.length - ext.length);
  let base = stem
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!base) base = "image";
  return `${base}${ext}`;
}

/**
 * Build a unique stored filename so concurrent uploads never collide.
 *
 * @param {string} original client filename (used only for its sanitised shape)
 * @returns {string}
 */
export function buildStoredFilename(original) {
  const safe = sanitizeImageName(original);
  const prefix = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
  return `${prefix}-${safe}`;
}

function resolveUploadsDir(opts) {
  if (opts?.dir && typeof opts.dir === "string") return opts.dir;
  return join(process.cwd(), "public", "uploads");
}

/**
 * Persist image bytes and return the public URL path.
 *
 * @param {Buffer|Uint8Array} buffer image bytes (non-empty, within MAX_IMAGE_BYTES)
 * @param {string} originalName client filename, for extension + readable slug
 * @param {{dir?: string}} [opts] test override for the upload directory
 * @returns {Promise<string>} e.g. `/uploads/k3j9ab-1f2e3d-necklace.png`
 */
export async function saveImage(buffer, originalName, opts) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer ?? []);
  if (bytes.length === 0) {
    throw new Error("Image is empty.");
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 5MB).");
  }
  const stored = buildStoredFilename(originalName);
  const dir = resolveUploadsDir(opts);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, stored), bytes);
  return `/uploads/${stored}`;
}

/**
 * Delete a previously saved upload.
 *
 * @param {unknown} url the `/uploads/...` URL returned by `saveImage`
 * @param {{dir?: string}} [opts] test override for the upload directory
 * @returns {Promise<boolean>} true when a file was removed
 */
export async function deleteImage(url, opts) {
  if (typeof url !== "string" || !url.startsWith("/uploads/")) return false;
  // `basename` strips any directory: a traversal payload like
  // `/uploads/../../x.png` yields `x.png`, which will not equal the raw tail,
  // so the delete is refused. `join` keeps the path statically scoped under
  // the uploads dir (no dynamic `resolve`, keeping Turbopack tracing happy).
  const name = url.slice("/uploads/".length);
  if (!name || name !== basename(name) || name.includes("\\")) return false;
  const target = join(/*turbopackIgnore: true*/ resolveUploadsDir(opts), name);
  try {
    await unlink(target);
    return true;
  } catch (err) {
    if (err?.code === "ENOENT") return false;
    throw err;
  }
}
