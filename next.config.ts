import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    '*': [
      './public/uploads/**/*',
      './uploads/**/*',
      './backups/**/*',
    ],
  },
};

export default nextConfig;
