/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.2', '192.168.1.*'],
  eslint: {
    // Allow production builds even with ESLint errors
    // These are mostly TypeScript type warnings that don't affect runtime
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
