import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Node-environment unit tests for pure lib modules. The `@` alias mirrors the tsconfig path so a
// test (or module under test) can import `@/lib/...`; resolved from the repo root via process.cwd().
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": resolve(process.cwd()) },
  },
});
