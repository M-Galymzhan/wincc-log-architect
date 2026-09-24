import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://wincc-log-architect.vercel.app';
  const releaseDate = new Date('2026-09-24T00:00:00Z');

  return [
    {
      url: baseUrl,
      lastModified: releaseDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/unified`,
      lastModified: releaseDate,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/comfort`,
      lastModified: releaseDate,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/professional`,
      lastModified: releaseDate,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/master-tags`,
      lastModified: releaseDate,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/?lang=en`,
      lastModified: releaseDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];
}
