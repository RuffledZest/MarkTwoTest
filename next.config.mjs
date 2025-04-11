/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    output: 'export', // ✅ Required
  images: {
    unoptimized: true, // ✅ Required
  },
  trailingSlash: true, // ✅ Recommended
};

export default nextConfig;
