"use client";

/**
 * Shop filter bar: search, category chips, vibe chips and sort.
 *
 * State lives in the URL, not in React — that is what makes a filtered view shareable and
 * survivable on refresh/back. So every control is a real link or a real GET form, which
 * means the whole bar works with JavaScript disabled. The ONLY thing JS adds is auto-submit
 * on the sort select; without it the visible "Apply" button still works.
 *
 * `state` arrives already normalised from `parseShopParams` (server side), so this file
 * never has to guess whether a value is a real filter.
 */

import Link from "next/link";
import { useRef } from "react";
import {
  DEFAULT_SORT,
  PRODUCT_VIBES,
  SORTS,
} from "../lib/catalog.js";
import { buildShopHref, hasActiveFilters } from "../lib/shop-filters.js";

/** Chip styling. `active` gets the filled brand treatment plus a visible ring. */
function chipClass(active) {
  return [
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-bold transition",
    "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red",
    active
      ? "border-brand bg-brand text-white"
      : "border-neutral-200 bg-white text-neutral-700 hover:border-brand hover:text-brand-dark",
  ].join(" ");
}

/**
 * One togglable filter chip. Clicking the active chip clears that filter, so a chip
 * doubles as its own "off" switch.
 */
function FilterChip({ href, active, children, label }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      aria-label={label}
      className={chipClass(active)}
    >
      {children}
    </Link>
  );
}

export default function ShopFilters({ categories, state, resultCount }) {
  const sortFormRef = useRef(null);

  const filtersOn = hasActiveFilters(state);

  /** Replace one field of the current state and rebuild the href. */
  const hrefWith = (patch) => buildShopHref({ ...state, ...patch });

  // Hidden inputs carry the OTHER active filters through the form, so using the search box
  // or the sort select does not silently drop a category the shopper already picked.
  const carriedParams = [
    ...(state.category ? [["category", state.category]] : []),
    ...(state.vibe ? [["vibe", state.vibe]] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* --- Search + sort --- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <form action="/shop" method="get" className="flex-1" role="search">
          {carriedParams.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <label
            htmlFor="shop-search"
            className="mb-1.5 block text-sm font-bold text-neutral-700"
          >
            Search the drop
          </label>
          <div className="flex gap-2">
            <input
              id="shop-search"
              type="search"
              name="q"
              defaultValue={state.q ?? ""}
              placeholder="ruby, cuff, heart…"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-2xl border-2 border-neutral-200 px-4 py-3 text-base placeholder:text-neutral-400 focus:border-brand focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
            />
            <button
              type="submit"
              className="shrink-0 rounded-2xl bg-neutral-900 px-5 py-3 font-bold text-white transition hover:bg-brand focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
            >
              Search
            </button>
          </div>
        </form>

        <form action="/shop" method="get" ref={sortFormRef} className="sm:w-56">
          {carriedParams.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {state.q ? <input type="hidden" name="q" value={state.q} /> : null}
          <label
            htmlFor="shop-sort"
            className="mb-1.5 block text-sm font-bold text-neutral-700"
          >
            Sort by
          </label>
          <select
            id="shop-sort"
            name="sort"
            defaultValue={state.sort}
            // Progressive enhancement: JS auto-applies, but the button below is the
            // no-JS path, so the select is never a dead control.
            onChange={() => sortFormRef.current?.requestSubmit()}
            className="w-full rounded-2xl border-2 border-neutral-200 bg-white px-4 py-3 font-semibold focus:border-brand focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          >
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {/* Only useful without JS; hidden once JS takes over so the bar stays quiet. */}
          <noscript>
            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-neutral-900 px-4 py-2 font-bold text-white"
            >
              Apply sort
            </button>
          </noscript>
        </form>
      </div>

      {/* --- Category chips --- */}
      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
          Category
        </h2>
        <div className="flex flex-wrap gap-2">
          <FilterChip href={hrefWith({ category: undefined })} active={!state.category}>
            All
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              key={category.slug}
              href={hrefWith({ category: category.slug })}
              active={state.category === category.slug}
              label={`Shop ${category.name}`}
            >
              {category.name}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* --- Vibe chips --- */}
      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
          Vibe
        </h2>
        <div className="flex flex-wrap gap-2">
          <FilterChip href={hrefWith({ vibe: undefined })} active={!state.vibe}>
            All vibes
          </FilterChip>
          {PRODUCT_VIBES.map((vibe) => (
            <FilterChip
              key={vibe}
              href={hrefWith({ vibe })}
              active={state.vibe === vibe}
              label={`Shop ${vibe} pieces`}
            >
              {vibe}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* --- Result summary --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
        <p aria-live="polite" className="text-sm font-semibold text-neutral-600">
          {resultCount === 0
            ? "No pieces match"
            : `${resultCount} ${resultCount === 1 ? "piece" : "pieces"}`}
          {state.sort !== DEFAULT_SORT ? ` · sorted by ${SORTS[state.sort]}` : ""}
        </p>
        {filtersOn ? (
          <Link
            href="/shop"
            className="rounded-full border-2 border-neutral-900 px-4 py-2 text-sm font-bold text-neutral-900 transition hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          >
            Clear all filters
          </Link>
        ) : null}
      </div>
    </div>
  );
}