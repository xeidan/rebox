
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "dahlqmbcazlotvybyykx.supabase.co",
      },
      {
        protocol: "https",
        hostname: "api.mobileapi.dev",
      },
    ],
  },
};

export default nextConfig;
