/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@cdy/shared'],
};

module.exports = nextConfig;
