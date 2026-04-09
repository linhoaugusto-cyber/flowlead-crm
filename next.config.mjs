/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
