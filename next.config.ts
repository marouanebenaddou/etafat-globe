import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "etafat.ma",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
