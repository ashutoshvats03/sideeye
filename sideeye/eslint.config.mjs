// ESLint flat config.
// `next lint` was removed in Next.js 16 (see docs/app/api-reference/config/eslint),
// so the ESLint CLI is used directly. `bun run lint` -> `eslint .`

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    // Generated Prisma client (Plan 01 Task 3).
    "lib/generated/**",
  ]),
]);
