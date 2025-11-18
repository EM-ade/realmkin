/**
 * Keep JS config in sync with next.config.ts to ensure environments that load JS take the same settings.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'gateway.irys.xyz',
      'arweave.net',
      'ipfs.io',
      'nftstorage.link',
      'cloudflare-ipfs.com',
      'shdw-drive.genesysgo.net',
      'cdn.helius.xyz',
      'metadata.degods.com',
    ],
    remotePatterns: [{ protocol: 'https', hostname: '*' }],
    dangerouslyAllowSVG: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

module.exports = nextConfig;
