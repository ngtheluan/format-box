import bundleAnalyzer from "@next/bundle-analyzer";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
    // Keep the Node WebSocket stack intact; Next's server bundler can
    // transform ws internals used by msedge-tts and break frame masking.
    serverComponentsExternalPackages: ["msedge-tts", "isomorphic-ws", "ws"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "live.staticflickr.com" },
    ],
  },
  modularizeImports: {
    "@tabler/icons-react": {
      transform: "@tabler/icons-react/dist/esm/icons/{{member}}.mjs",
      preventFullImport: true,
    },
  },
};

export default withBundleAnalyzer(nextConfig);
