import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack alias — stub out the native `canvas` module
  turbopack: {
    resolveAlias: {
      canvas: "./empty-module.ts",
    },
  },

  // Keep @react-pdf/renderer out of the SSR bundle entirely.
  // Do NOT also list it in transpilePackages — those two options conflict.
  serverExternalPackages: ["@react-pdf/renderer"],

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  devIndicators: false,
};

export default nextConfig;
