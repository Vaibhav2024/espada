import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["ioredis", "bullmq", "postgres"],
};

export default nextConfig;
