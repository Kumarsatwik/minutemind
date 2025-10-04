import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow Clerk profile images
    domains: ['img.clerk.com'],
  },
};

export default nextConfig;
