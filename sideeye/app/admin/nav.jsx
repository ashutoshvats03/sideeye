import Link from "next/link";
import { ADMIN_SECTIONS, adminNeighbors } from "../../lib/admin-sections.js";

/**
 * Shared admin navigation: section pills plus Previous/Next pager stepping
 * through Dashboard → Products → Orders → Coupons → Reviews → Users.
 * Rendered on every /admin/* page; the section order lives in
 * lib/admin-sections.js, not copy-pasted here.
 */
export default function AdminNav({ current }) {
  const { prev, next } = adminNeighbors(current);
  return (
    <div>
      <nav aria-label="Admin sections" className="mt-4 flex flex-wrap gap-2">
        {ADMIN_SECTIONS.map(({ label, href }) =>
          href === current ? (
            <span
              key={href}
              aria-current="page"
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-bold text-white"
            >
              {label}
            </span>
          ) : (
            <Link
              key={href}
              href={href}
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-bold hover:border-neutral-900"
            >
              {label}
            </Link>
          ),
        )}
      </nav>
      <div className="mt-3 flex items-center justify-between gap-2">
        {prev ? (
          <Link
            href={prev.href}
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-bold hover:border-neutral-900"
          >
            ← Previous · {prev.label}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={next.href}
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-bold hover:border-neutral-900"
          >
            Next · {next.label} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
