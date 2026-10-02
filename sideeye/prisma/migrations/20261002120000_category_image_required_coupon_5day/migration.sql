-- Category.image is now required (all rows already had images; verified 0 NULL).
-- Coupon.expiresAt is now required; the app sets it to startsAt + 5 days
-- (see defaultCouponExpiry in lib/coupons.js). Pre-existing NULLs were
-- backfilled to startsAt + 5 days before this migration.
--
-- NOTE: the Order.idempotencyKey column was added to the database out-of-band
-- (before this migration was tracked). The ADD COLUMN below is IF NOT EXISTS
-- so this migration is a safe baseline whether or not that column is present.

-- Baseline the previously untracked idempotencyKey (safe if already applied).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'Order_idempotencyKey_key'
  ) THEN
    CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
  END IF;
END
$$;

-- Backfill guard: any NULL expiries become startsAt + 5 days.
UPDATE "Coupon" SET "expiresAt" = "startsAt" + INTERVAL '5 days' WHERE "expiresAt" IS NULL;

-- Enforce NOT NULL (Category had 0 NULL images at migration time).
ALTER TABLE "Category" ALTER COLUMN "image" SET NOT NULL;
ALTER TABLE "Coupon" ALTER COLUMN "expiresAt" SET NOT NULL;
