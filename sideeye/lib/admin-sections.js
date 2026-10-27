/**
 * Admin section order — single owner for the section pills and the
 * Previous/Next pager. Every /admin/* page renders the same nav, so the
 * order lives here, not copy-pasted per page.
 */

/** @type {{label: string, href: string}[]} */
export const ADMIN_SECTIONS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Coupons", href: "/admin/coupons" },
  { label: "Reviews", href: "/admin/reviews" },
  { label: "Users", href: "/admin/users" },
];

/**
 * Previous/next section for a page path. Edges yield null on that side;
 * unknown paths yield both null.
 *
 * @param {string} href current page path
 * @returns {{prev: {label: string, href: string} | null, next: {label: string, href: string} | null}}
 */
export function adminNeighbors(href) {
  const i = ADMIN_SECTIONS.findIndex((s) => s.href === href);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? ADMIN_SECTIONS[i - 1] : null,
    next: i < ADMIN_SECTIONS.length - 1 ? ADMIN_SECTIONS[i + 1] : null,
  };
}
