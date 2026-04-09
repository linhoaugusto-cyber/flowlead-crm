/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
