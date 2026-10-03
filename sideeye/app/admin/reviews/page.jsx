import { requireAdmin } from "../../../lib/guards.js";
import { prisma } from "../../../lib/prisma.js";
import ReviewButtons from "./buttons.jsx";

export const metadata = {
  title: "Admin reviews — SideEye",
};

export default async function AdminReviewsPage() {
  await requireAdmin();

  const [pending, recent] = await Promise.all([
    prisma.review.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        rating: true,
        text: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        rating: true,
        text: true,
        createdAt: true,
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Reviews</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {pending.length} awaiting moderation. Approving makes a review visible on the
        product page; only approved reviews ever render there.
      </p>

      <h2 className="mt-8 font-display text-xl font-extrabold">Pending</h2>
      {pending.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-600">Nothing waiting — inbox zero.</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {pending.map((r) => (
            <li key={r.id} className="rounded-2xl border border-neutral-200 p-4">
              <p className="text-sm">
                <span className="font-extrabold">{"★".repeat(r.rating)}</span>{" "}
                <span className="text-neutral-500">{"☆".repeat(5 - r.rating)}</span>
              </p>
              {r.text && <p className="mt-1 text-sm">{r.text}</p>}
              <p className="mt-1 text-xs text-neutral-500">
                {r.user?.name ?? "Shopper"} · {r.product?.name} ·{" "}
                {new Date(r.createdAt).toLocaleString("en-IN")}
              </p>
              <ReviewButtons id={r.id} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-display text-xl font-extrabold">Recently approved</h2>
      {recent.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-600">None yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
          {recent.map((r) => (
            <li key={r.id} className="px-4 py-2.5 text-sm">
              <span className="font-bold">{"★".repeat(r.rating)}</span>{" "}
              <span className="text-neutral-600">
                {r.text?.slice(0, 80) ?? "(no text)"} — {r.user?.name} on {r.product?.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
