import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['settlesettle'],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
