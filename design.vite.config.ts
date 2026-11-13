import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/** A static gallery of design directions, viewable from disk in any browser. */
export default defineConfig({
  root: resolve("src/renderer"),
  base: "./",
  resolve: { alias: { "@shared": resolve("src/shared"), "~": resolve("src/renderer/src") } },
  // One self-contained HTML file, so the gallery opens straight from disk.
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: resolve(process.env.DESIGN_OUT ?? "design-dist"),
    emptyOutDir: true,
    rollupOptions: { input: resolve("src/renderer/design.html") },
  },
});
