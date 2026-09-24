import type { Metadata } from 'next';
import Home from '../page';

export const metadata: Metadata = {
  title: 'WinCC Unified SQLite WAL Archive & Storage Calculator | TIA Portal',
  description: 'Инженерный онлайн-калькулятор архивов WinCC Unified: точный расчет SQLite WAL сегментов по 4 МБ, правило кольцевого буфера (>= 3 сегментов), ресурс SIMATIC SD-карт (TBW) и фактор Write Amplification 1.5x для TIA Portal V16–V21+.',
  keywords: [
    'wincc unified tag logging',
    'wincc unified sqlite wal',
    'wincc unified archive calculator',
    'wincc unified storage sizing',
    'wincc unified 4mb segment',
    'simatic unified comfort panel storage',
    'mtp700 mtp1200 mtp1500 mtp1900 mtp2200 storage',
    'tia portal unified tag logging',
    'sqlite write amplification wincc',
    'simatic sd card tbw calculation',
  ],
  alternates: {
    canonical: 'https://wincc-log-architect.vercel.app/unified',
  },
  openGraph: {
    title: 'WinCC Unified SQLite WAL Archive & Storage Calculator | TIA Portal',
    description: 'Инженерный расчет баз данных SQLite WAL WinCC Unified: сегментация по 4 МБ, кольцевой буфер и ресурс карт памяти.',
    url: 'https://wincc-log-architect.vercel.app/unified',
    siteName: 'Siemens WinCC Log & Storage Architect',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WinCC Unified SQLite WAL Archive & Storage Calculator',
    description: 'Расчет сегментов SQLite WAL и времени жизни карт памяти для WinCC Unified в TIA Portal V16–V21+.',
  },
};

export default function UnifiedPage() {
  return <Home initialTab="unified" />;
}
