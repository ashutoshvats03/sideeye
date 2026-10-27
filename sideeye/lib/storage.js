/**
 * Product image storage — the single seam for where bytes live.
 *
 * Two backends, selected at runtime by env vars:
 *   - Cloudflare R2 (when R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY
 *     + R2_BUCKET_NAME + R2_PUBLIC_URL are set): objects are PUT to R2 and served
 *     from R2_PUBLIC_URL. This is the production path (Vercel/serverless safe).
 *   - Local disk `public/uploads` (fallback when R2 is not configured): v1 VPS path,
 *     used in dev and by the storage tests via the `{ dir }` override.
 *
 * Nothing else in the app learns where bytes live: callers use only
 * `saveImage(buffer, originalName)` → public URL and `deleteImage(url)`.
 */
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { randomBytes } from "node:crypto";

/** Image extensions we accept from admin uploads. Lowercase, with dot. */
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

/** Sane per-file cap: 5 MiB. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

export function buildStoredFilename(original) {
  const safe = sanitizeImageName(original);
  const prefix = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
  return `${prefix}-${safe}`;
}

/** True when all R2 env vars are present. */
function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl: publicUrl.replace(/\/+$/, "") };
}

function resolveUploadsDir(opts) {
  if (opts?.dir && typeof opts.dir === "string") return opts.dir;
  return join(process.cwd(), "public", "uploads");
}

export async function saveImage(buffer, originalName, opts) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer ?? []);
  if (bytes.length === 0) throw new Error("Image is empty.");
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error("Image is too large (max 5MB).");

  const stored = buildStoredFilename(originalName);
  const cfg = r2Config();

  // Test override forces local disk even when R2 is configured.
  if (!cfg || opts?.dir) {
    const dir = resolveUploadsDir(opts);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, stored), bytes);
    return `/uploads/${stored}`;
  }

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: stored,
      Body: bytes,
      ContentType: mimeTypeFor(stored),
    }),
  );
  return `${cfg.publicUrl}/${stored}`;
}

export async function deleteImage(url, opts) {
  const cfg = r2Config();

  // Local-disk path (legacy /uploads/ URLs or test override).
  if (!cfg || opts?.dir || (typeof url === "string" && url.startsWith("/uploads/"))) {
    if (typeof url !== "string" || !url.startsWith("/uploads/")) return false;
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

  // R2 path: URL is `${publicUrl}/${key}`.
  if (typeof url !== "string" || !url.startsWith(cfg.publicUrl + "/")) return false;
  const key = url.slice(cfg.publicUrl.length + 1);
  if (!key || key !== basename(key)) return false;
  const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  try {
    await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function mimeTypeFor(name) {
  const ext = extname(name).toLowerCase();
  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".avif": "image/avif",
    }[ext] || "application/octet-stream"
  );
}
