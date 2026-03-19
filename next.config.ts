import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // App is mounted at /bumbleupon in production
  basePath: "/bumbleupon",
  // Make /bumbleupon/ the canonical URL (and /bumbleupon redirects there)
  trailingSlash: true,
};

export default nextConfig;
