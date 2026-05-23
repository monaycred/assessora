import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["assessora.gedaias.com", "localhost:3000"],
    },
  },
};

export default nextConfig;
