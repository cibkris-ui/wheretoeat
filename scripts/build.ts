import { execSync } from "child_process";
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";

// Build client with Vite
console.log("Building client...");
execSync("npx vite build", { stdio: "inherit" });

// Get all production dependencies to bundle
const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const deps = Object.keys(pkg.dependencies || {});

// Build server with esbuild - bundle everything except native modules
console.log("Building server...");
await esbuild.build({
  entryPoints: ["server/index.ts"],
  outfile: "dist/index.cjs",
  platform: "node",
  format: "cjs",
  bundle: true,
  target: "node20",
  external: [
    // Native modules that can't be bundled
    "pg-native",
    "better-sqlite3",
    // Dev-only dependencies (vite is dynamically imported in dev only)
    "./vite",
    "./vite.js",
  ],
  alias: {
    "@shared": "./shared",
  },
  sourcemap: true,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

console.log("Build complete!");
