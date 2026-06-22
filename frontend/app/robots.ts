import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/teacher', '/admin', '/student', '/api'],
      },
    ],
    sitemap: 'https://katie-english.com.vn/sitemap.xml',
  };
}
