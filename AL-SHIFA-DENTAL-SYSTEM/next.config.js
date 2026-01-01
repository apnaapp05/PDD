/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Images domain configuration agar future mein external images use karein
  images: {
    domains: [], 
  },
};

module.exports = nextConfig;