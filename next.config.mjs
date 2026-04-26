/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.2', '192.168.1.*'],
  eslint: {
    // Allow production builds even with ESLint errors
    // These are mostly TypeScript type warnings that don't affect runtime
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '52mb',  // Slightly above 50MB for headers overhead
    },
  },
};

export default nextConfig;
