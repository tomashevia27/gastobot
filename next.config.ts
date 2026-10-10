import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  distDir: process.env.GASTOBOT_E2E === "1" ? ".next-e2e" : undefined,
};

export default nextConfig;
