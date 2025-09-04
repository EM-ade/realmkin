/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*', // Allow all HTTPS domains
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

module.exports = nextConfig;
