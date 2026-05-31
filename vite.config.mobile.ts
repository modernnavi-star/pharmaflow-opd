import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Relative paths make the same static build work in Android WebView and GitHub Pages.
  base: "./",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: "dist/mobile",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "mobile.html"),
      },
    },
  },
});
