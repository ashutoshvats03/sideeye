-- Add an optional birthday to User (Plan 05 Task 3). Nullable, no backfill.
ALTER TABLE "User" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
