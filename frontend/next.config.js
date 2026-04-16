/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // En desarrollo, Next.js proxea /api/* al backend.
    // En producción se configura con la URL real del backend.
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:3001'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
