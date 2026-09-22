import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://wincc-log-architect.vercel.app';
  const releaseDate = new Date('2026-09-22T00:00:00Z');

  return [
    {
      url: baseUrl,
      lastModified: releaseDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/?lang=ru`,
      lastModified: releaseDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/?lang=en`,
      lastModified: releaseDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];
}
