/**
 * Order-timeline normaliser (pure, unit-testable).
 *
 * `Order.timeline` is untyped JSON (`[{ status, at, note }]` by convention),
 * so the detail page never trusts it: non-arrays become [], entries without a
 * string status are dropped, and entries with a missing/unparseable `at`
 * sort last instead of crashing the render.
 *
 * @param {unknown} value raw `Order.timeline`
 * @returns {{status: string, at: string, note: string}[]} oldest-first
 */
export function normaliseTimeline(value) {
  if (!Array.isArray(value)) return [];
  const timeOf = (at) => {
    const t = Date.parse(at);
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  };
  return value
    .filter((e) => e && typeof e === "object" && typeof e.status === "string" && e.status.length > 0)
    .map((e) => ({
      status: e.status,
      at: typeof e.at === "string" ? e.at : "",
      note: typeof e.note === "string" ? e.note : "",
    }))
    .sort((a, b) => timeOf(a.at) - timeOf(b.at));
}
