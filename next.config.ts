import type { NextConfig } from "next";

const defaultDetector =
  process.env.NODE_ENV === "production"
    ? "https://ransomware-detector-rl65.onrender.com"
    : "http://127.0.0.1:43124";

const detector = (process.env.DETECTOR_URL || defaultDetector)
  .trim()
  .replace(/\/api\/?$/i, "")
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/history",
        permanent: false,
      },
      {
        source: "/monitor",
        destination: "/",
        permanent: false,
      },
      {
        source: "/evaluation",
        destination: "/history",
        permanent: false,
      },
      {
        source: "/alerts",
        destination: "/history",
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
