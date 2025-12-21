import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "jacebook-worker.jacebook.workers.dev" },
      { protocol: "https", hostname: "images.ft.com" }, // if you keep that fallback
    ],
  },
};

export default nextConfig;
