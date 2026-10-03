import Link from "next/link";
import { requireUser } from "../../../lib/guards.js";
import { prisma } from "../../../lib/prisma.js";
import AddressManager from "./address-manager.jsx";

export const metadata = {
  title: "Addresses — SideEye",
};

export const dynamic = "force-dynamic";

/**
 * Saved delivery addresses. Deleting one never touches an order — orders
 * render from their frozen `addressSnapshot`, not from this table.
 */
export default async function AccountAddressesPage() {
  const user = await requireUser("/account/addresses");

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/account" className="text-sm font-bold text-brand hover:underline">
        ← Account
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Addresses</h1>
      <AddressManager initial={addresses} />
    </div>
  );
}
