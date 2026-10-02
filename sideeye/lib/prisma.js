/**
 * Shared Prisma client singleton.
 *
 * Next.js dev-mode hot reload re-evaluates modules on every edit. Without caching the
 * instance on globalThis, each reload would open a new Postgres connection pool and
 * eventually exhaust connections. Standard pattern for Prisma + Next.js.
 *
 * Uses the pg driver adapter because Prisma 7 requires an explicit adapter.
 * The adapter is constructed from DATABASE_URL directly so this module works
 * regardless of whether it is imported by Bun (app/seed) or Node (Prisma CLI).
 */

// Bare specifier on purpose: Prisma 7's `prisma-client` generator only emits TypeScript
// (`generatedFileExtension` accepts ts/mts/cts, never js), so there is no client.js on
// disk. Bun and Turbopack both resolve this to client.ts.
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;

/** @type {PrismaClient | undefined} */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
