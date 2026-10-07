import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": resolve(root, ".") },
  },
  test: {
    environment: "jsdom",
    include: ["tests/ui/**/*.test.ts", "tests/ui/**/*.test.tsx"],
  },
});
