import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/teacher', '/admin', '/game', '/api'],
      },
    ],
    sitemap: 'https://katie.vn/sitemap.xml',
  };
}
