import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: [
          'Googlebot',
          'YandexBot',
          'Bingbot',
          'Applebot',
          'GPTBot',
          'PerplexityBot',
          'ClaudeBot',
          'Google-Extended',
        ],
        allow: '/',
      },
    ],
    sitemap: 'https://wincc-log-architect.vercel.app/sitemap.xml',
    host: 'https://wincc-log-architect.vercel.app',
  };
}
