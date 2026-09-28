import type { NextConfig } from "next";

const detector = process.env.DETECTOR_URL || "http://127.0.0.1:43124";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/monitor",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${detector}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
