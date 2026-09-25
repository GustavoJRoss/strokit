import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@strokit/core"],
  images: { unoptimized: true },
};

export default nextConfig;
