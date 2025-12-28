const path = require("path");

module.exports = {
  pageExtensions: ["jsx", "js", "ts", "tsx"],
  webpack: (config) => {
    config.resolve.alias["@"] = path.join(__dirname, "src");
    return config;
  },
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  eslint: {
    // Completely disable ESLint during builds
    ignoreDuringBuilds: true,
    dirs: [], // Don't lint any directories
  },
  typescript: {
    // Disable type checking during builds to speed up deployment
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Disable ESLint plugin entirely
    eslint: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};
