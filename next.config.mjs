import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import bundleAnalyzer from "@next/bundle-analyzer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));
const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || "";
const shortSha = sha ? sha.slice(0, 7) : "";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: `v${pkg.version}`,
    NEXT_PUBLIC_APP_COMMIT: shortSha,
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  modularizeImports: {
    "@tabler/icons-react": {
      transform: "@tabler/icons-react/dist/esm/icons/{{member}}.mjs",
      preventFullImport: true,
    },
  },
};

export default withBundleAnalyzer(nextConfig);
