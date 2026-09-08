import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Siemens WinCC Log & Storage Architect',
    short_name: 'WinCC Log Calc',
    description: 'Engineering sizing and validation for Siemens WinCC Unified, Comfort & Professional Data Logs in TIA Portal',
    start_url: '/',
    display: 'standalone',
    background_color: '#070D18',
    theme_color: '#00646E',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
