import { requireAdmin } from "../../../lib/guards.js";
import { prisma } from "../../../lib/prisma.js";
import ProductManager from "./manager.jsx";

export const metadata = {
  title: "Admin products — SideEye",
};

export default async function AdminProductsPage() {
  await requireAdmin();

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        care: true,
        materials: true,
        pricePaise: true,
        mrpPaise: true,
        stockQty: true,
        images: true,
        categoryId: true,
        vibes: true,
        tags: true,
        isActive: true,
        category: { select: { name: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Products</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {products.length} product(s) · {categories.length} categor(ies). Prices are in
        rupees below and stored as integer paise.
      </p>
      <ProductManager initialProducts={products} categories={categories} />
    </div>
  );
}
