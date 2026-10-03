/**
 * Shared product-image fallback.
 *
 * A product may legitimately have no photos (listed before the shoot).
 * Every render site must go through `primaryImage` — passing
 * `images[0]` straight into `next/image` crashes the page when it is
 * `undefined`, which is exactly the no-photo malfunction.
 */

/** Shown whenever a product has no usable photo of its own. */
export const FALLBACK_PRODUCT_IMAGE = "/brand/product-ring-red-stone.jpg";

/**
 * First usable photo, or the brand fallback.
 *
 * @param {unknown} images product images (or anything unexpected)
 * @returns {string} a src that is always safe for next/image
 */
export function primaryImage(images) {
  if (Array.isArray(images)) {
    const first = images.find((s) => typeof s === "string" && s.trim().length > 0);
    if (first) return first;
  }
  return FALLBACK_PRODUCT_IMAGE;
}

/**
 * Append an uploaded photo url to the form's image list.
 *
 * @param {unknown} images current list (or anything unexpected)
 * @param {unknown} url uploaded photo url
 * @returns {string[]} new list, unchanged when the url is blank
 */
export function appendImage(images, url) {
  const list = Array.isArray(images) ? images : [];
  if (typeof url !== "string" || url.trim().length === 0) return [...list];
  return [...list, url];
}
