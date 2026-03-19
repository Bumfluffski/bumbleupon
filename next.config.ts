import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Serve the app under /bumbleupon instead of /
  basePath: "/bumbleupon",
};

export default nextConfig;
