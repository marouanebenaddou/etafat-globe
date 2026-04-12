import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/v2",
        permanent: false,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "etafat.ma",
        pathname: "/**",
      },
    ],
    formats: ["image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "@react-three/fiber", "@react-three/drei"],
  },
};

export default nextConfig;
