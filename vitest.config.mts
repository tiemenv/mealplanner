import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the "@/*" alias from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    // The suite covers pure planning logic, so there is no DOM to emulate.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
