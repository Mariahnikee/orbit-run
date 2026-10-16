import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // Start.ng may serve the static build from a subpath.
  base: "./",
  plugins: [
    {
      name: "copy-root-cover-to-dist",
      closeBundle() {
        const source = resolve(process.cwd(), "cover.png");
        if (!existsSync(source)) {
          console.warn("cover.png was not found in the project root; add it before publishing.");
          return;
        }

        const outputDir = resolve(process.cwd(), "dist");
        mkdirSync(outputDir, { recursive: true });
        copyFileSync(source, resolve(outputDir, "cover.png"));
      },
    },
  ],
});
