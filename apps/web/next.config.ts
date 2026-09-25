import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@strokekit/core"],
  images: { unoptimized: true },
};

export default nextConfig;
