import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./scripts/setup-test.ts"],
    environment: "jsdom",
    include: ["**/*.test.?(c|m)[jt]s?(x)"],
  },
});
