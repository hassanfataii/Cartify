import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
  ],

  test: {
    environment: "jsdom",

    setupFiles: [
      "./src/test/setup.js",
    ],

    css: true,
    clearMocks: true,
    restoreMocks: true,

    testTimeout: 10000,
  },
});