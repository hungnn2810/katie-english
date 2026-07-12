const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/game/:path*', destination: '/student/:path*', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
