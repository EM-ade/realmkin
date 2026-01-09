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
      // W3S IPFS gateways for Realmkin NFTs
      "bafybeie7ne2t3wtfie6n5zrtglmsszw4xdhlg542xs5vu5ykxkk4xfshxi.ipfs.w3s.link",
      "w3s.link",
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
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.mainnet-beta.solana.com https://*.helius-rpc.com https://discord.com https://*.ipfs.io https://*.arweave.net https://gateway.irys.xyz https://shdw-drive.genesysgo.net https://cdn.helius.xyz https://vitals.vercel-insights.com",
              "frame-src 'self' https://vercel.live",
            ].join("; "),
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
