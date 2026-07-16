import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Integration tests hit a REAL Supabase project (looprr-dev) through the governed route handlers.
// They require env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server-only secret, NEVER
// committed — set it locally or in the Vercel env). The per-role LOOPRR_AGENT_TOKEN_* are set by the
// suite itself. NOT part of `npm test` / CI (needs a secret); run with `npm run test:integration`.
// The suite self-skips when the required env is absent, so it is safe to invoke anywhere.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/integration/**/*.itest.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": resolve(process.cwd()) },
  },
});
