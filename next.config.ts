import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    // Explicitly allow common NFT CDN/IPFS gateways
    domains: [
      "gateway.irys.xyz",
      "arweave.net",
      "ipfs.io",
      "nftstorage.link",
      "cloudflare-ipfs.com",
      "shdw-drive.genesysgo.net",
      "cdn.helius.xyz",
      "metadata.degods.com",
    ],
    remotePatterns: [
      { protocol: "https", hostname: "*" },
    ],
    dangerouslyAllowSVG: true,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Performance & Security
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Headers for security and performance
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  // Redirects for better UX
  async redirects() {
    return [
      {
        source: "/discord",
        destination: "/discord/page",
        permanent: false,
      },
    ];
  },

  // Webpack optimization
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              filename: "chunks/vendor.js",
              test: /node_modules/,
              priority: 10,
              reuseExistingChunk: true,
              name: "vendor",
            },
            // Common chunk
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              name: "common",
            },
          },
        },
      };
    }
    return config;
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["@vercel/analytics", "@vercel/speed-insights"],
  },
};

export default nextConfig;
