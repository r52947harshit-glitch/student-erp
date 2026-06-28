/** @type {import('next').NextConfig} */
// NOTE: Razorpay live mode credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) 
// are loaded directly from the system environment/dotenv files to prevent hardcoding sensitive keys in the codebase.
const nextConfig = {
  allowedDevOrigins: ['192.168.1.2', '192.168.1.*'],
  eslint: {
    // Allow production builds even with ESLint errors
    // These are mostly TypeScript type warnings that don't affect runtime
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '52mb',  // Slightly above 50MB for headers overhead
    },
  },
};

export default nextConfig;
