import type { Metadata } from 'next';
import Home from '../page';

export const metadata: Metadata = {
  title: 'WinCC Comfort & Advanced RDB Log Limit Calculator (500k Rows) | TIA Portal',
  description: 'Расчет архивов WinCC Comfort и PC Runtime Advanced: контроль системного лимита 500 000 строк на RDB/CSV файл, подбор SDHC карт до 32 ГБ (FAT32) и расчет Audit Trail для панелей SIMATIC Comfort в TIA Portal V14–V21+.',
  keywords: [
    'wincc comfort data log',
    'wincc comfort 500000 records limit',
    'wincc comfort archive calculator',
    'simatic comfort panel storage',
    'wincc advanced rdb archive',
    'wincc comfort alarm log',
    'tp700 tp900 tp1200 tp1500 tp1900 tp2200 storage',
    'fat32 32gb limit wincc comfort',
    'sequence of log files wincc',
    'simatic audit trail storage calculation',
  ],
  alternates: {
    canonical: 'https://wincc-log-architect.vercel.app/comfort',
  },
  openGraph: {
    title: 'WinCC Comfort & Advanced RDB Log Limit Calculator (500k Rows) | TIA Portal',
    description: 'Инженерный расчет архивов RDB/CSV для панелей Comfort: контроль лимита 500k записей и FAT32 32 ГБ.',
    url: 'https://wincc-log-architect.vercel.app/comfort',
    siteName: 'Siemens WinCC Log & Storage Architect',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WinCC Comfort & Advanced RDB Log Limit Calculator',
    description: 'Контроль лимита 500 000 записей на файл и расчет архивов Comfort/Advanced в TIA Portal.',
  },
};

export default function ComfortPage() {
  return <Home initialTab="comfort" />;
}
