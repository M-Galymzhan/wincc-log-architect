import type { Metadata } from 'next';
import Home from '../page';

export const metadata: Metadata = {
  title: 'TIA Portal HMI Tags 30-Column Excel Generator & Tag Hub | WinCC Tag Configurator',
  description: 'Универсальный конфигуратор тегов WinCC и генератор 30-колоночных файлов Excel (Hmi Tags.xlsx) для прямого импорта в Siemens TIA Portal V14–V21+. Проверка сглаживания, масштабирования и межплатформенной совместимости.',
  keywords: [
    'конфигуратор тегов wincc',
    'генератор тегов tia portal',
    'hmi tags excel 30 columns',
    'tia portal export tags to excel',
    'substitute value usage sheet',
    'wincc tag configurator',
    'bulk tag generator tia portal',
    'tia portal tag logging inspector',
    'hmi tags xlsx export import',
    'wincc unified comfort professional tag sync',
  ],
  alternates: {
    canonical: 'https://wincc-log-architect.vercel.app/master-tags',
  },
  openGraph: {
    title: 'TIA Portal HMI Tags 30-Column Excel Generator & Tag Hub | WinCC Tag Configurator',
    description: 'Генератор 30-колоночных таблиц Excel для прямого импорта в TIA Portal V14–V21+ и кросс-платформенный конфигуратор тегов WinCC.',
    url: 'https://wincc-log-architect.vercel.app/master-tags',
    siteName: 'Siemens WinCC Log & Storage Architect',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TIA Portal HMI Tags 30-Column Excel Generator & Tag Hub',
    description: 'Генератор 30-колоночных файлов Excel для TIA Portal V14–V21+ и мастер тегов архивации.',
  },
};

export default function MasterTagsPage() {
  return <Home initialTab="master_tags" />;
}
