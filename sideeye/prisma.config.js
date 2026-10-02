// Prisma 7 configuration.
//
// dotenv is required here even though the app runs on Bun: the `prisma` CLI
// itself is a Node binary, so Bun's automatic .env loading does not apply.
// Verified: without this import, `prisma validate` fails with
// "Cannot resolve environment variable: DATABASE_URL".
//
// Keep this file as .js — the project is JavaScript-only (no TypeScript).

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.js",
  },
  datasource: {
    // env() throws if unset, which fails `prisma generate` too.
    // DATABASE_URL is always present in this project (.env is gitignored but local),
    // so the strict helper is the safer choice — a missing URL should be loud.
    url: env("DATABASE_URL"),
  },
});
