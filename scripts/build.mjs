#!/usr/bin/env node
/**
 * Production build entry for SATHYA ecommerce.
 *
 * Default: Turbopack (`next build --turbopack`) — best path to multi-core builds
 * on this large App Router surface (~500 API routes + ~170 pages).
 *
 * Fallback: `npm run build:webpack` or `node scripts/build.mjs --webpack`
 *
 * Keep `.next/cache` between deploys so incremental builds stay fast.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

const argv = new Set(process.argv.slice(2));
const useWebpack =
  argv.has("--webpack") ||
  String(process.env.BUILD_BUNDLER || "").toLowerCase() === "webpack";

const nodeOpts = new Set(
  String(process.env.NODE_OPTIONS || "")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
);
if (![...nodeOpts].some((o) => o.startsWith("--max-old-space-size"))) {
  // Turbopack + large graphs need headroom; 8GB is enough on most deploy hosts.
  nodeOpts.add("--max-old-space-size=8192");
}

const env = {
  ...process.env,
  NODE_OPTIONS: [...nodeOpts].join(" "),
  UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || "16",
};

const args = ["next", "build"];
if (!useWebpack) {
  args.push("--turbopack");
  console.log("▶ Building with Turbopack (default fast path)");
} else {
  console.log("▶ Building with Webpack (fallback)");
}

const result = spawnSync("npx", args, {
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(result.status ?? 1);
