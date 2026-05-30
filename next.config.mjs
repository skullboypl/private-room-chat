/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  transpilePackages: ['emoji-picker-element', '@dicebear/core', '@dicebear/styles'],
};

export default nextConfig;
