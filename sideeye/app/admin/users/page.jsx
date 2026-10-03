import { requireAdmin } from "../../../lib/guards.js";
import { prisma } from "../../../lib/prisma.js";
import UserToggle from "./toggle.jsx";

export const metadata = {
  title: "Admin users — SideEye",
};

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      _count: { select: { orders: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Users</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {users.length} most recent user(s). Deactivating blocks their next request
        immediately — only emails are shown, never more PII than this screen needs.
      </p>
      <ul className="mt-6 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-bold">
                {u.name ?? "(no name)"}{" "}
                <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal capitalize text-neutral-600">
                  {u.role}
                </span>{" "}
                {!u.isActive && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-normal text-red-700">
                    deactivated
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {u.email} · {u._count.orders} order(s)
                {u.lastLoginAt
                  ? ` · last seen ${new Date(u.lastLoginAt).toLocaleDateString("en-IN")}`
                  : ""}
              </p>
            </div>
            <UserToggle id={u.id} isActive={u.isActive} />
          </li>
        ))}
        {users.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-neutral-500">No users yet.</li>
        )}
      </ul>
    </div>
  );
}
