import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    setupFiles: [
      "./test/setup.js",
    ],

    fileParallelism: false,

    sequence: {
      concurrent: false,
    },

    testTimeout: 15000,
    hookTimeout: 15000,

    reporters: [
      "default",
    ],
  },
});