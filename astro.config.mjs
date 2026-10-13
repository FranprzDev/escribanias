// @ts-check
import { defineConfig } from "astro/config";

// SITE y BASE_PATH permiten publicar en un subdirectorio (ej. GitHub Pages:
// SITE=https://franprzdev.github.io BASE_PATH=/escribanias).
export default defineConfig({
  output: "static",
  site: process.env.SITE || undefined,
  base: process.env.BASE_PATH || "/",
  trailingSlash: "ignore",
});
