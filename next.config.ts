import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io', '*.ngrok.app', '*.trycloudflare.com'],
};

export default nextConfig;
