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

// Generate production package.json in dist/
const prodPkg = {
  name: pkg.name,
  version: pkg.version,
  license: pkg.license,
  scripts: {
    start: "NODE_ENV=production NODE_TLS_REJECT_UNAUTHORIZED=0 node index.cjs",
  },
  dependencies: Object.fromEntries(
    ["bcryptjs", "connect-pg-simple", "cookie-parser", "dotenv", "drizzle-orm",
     "express", "express-rate-limit", "express-session", "multer", "nanoid",
     "node-cron", "pg", "resend", "zod", "zod-validation-error"]
      .filter(dep => pkg.dependencies[dep])
      .map(dep => [dep, pkg.dependencies[dep]])
  ),
};
fs.writeFileSync("dist/package.json", JSON.stringify(prodPkg, null, 2));

console.log("Build complete!");
