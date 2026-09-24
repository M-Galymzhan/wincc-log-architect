import type { Metadata } from 'next';
import Home from '../page';

export const metadata: Metadata = {
  title: 'WinCC Professional & V7/V8 Fast & Slow Tag Logging Sizing | MS SQL Calculator',
  description: 'Инженерный расчет архивов Fast и Slow Tag Logging для WinCC Professional и WinCC Classic V7/V8: разделение по циклу 1 с/1 мин, контроль лимита 10 ГБ SQL Server Express, расчет IOPS и объема MDF/LDF баз данных.',
  keywords: [
    'wincc professional tag logging',
    'wincc tag logging fast slow',
    'wincc v7 tag logging calculation',
    'wincc v8 tag logging sizing',
    'sql server express 10gb limit wincc',
    'wincc scada archive sizing',
    'tag logging mdf ldf size',
    'wincc professional required iops',
    'wincc classic archive size calculator',
    'tia portal wincc professional database sizing',
  ],
  alternates: {
    canonical: 'https://wincc-log-architect.vercel.app/professional',
  },
  openGraph: {
    title: 'WinCC Professional & V7/V8 Fast & Slow Tag Logging Sizing | MS SQL Calculator',
    description: 'Расчет баз данных MS SQL Server для WinCC Professional и WinCC V7/V8: Fast/Slow логирование и лимит SQL Express.',
    url: 'https://wincc-log-architect.vercel.app/professional',
    siteName: 'Siemens WinCC Log & Storage Architect',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WinCC Professional & V7/V8 Fast & Slow Tag Logging Sizing',
    description: 'Инженерный расчет Fast/Slow архивов MS SQL Server для WinCC Professional в TIA Portal и WinCC V7/V8.',
  },
};

export default function ProfessionalPage() {
  return <Home initialTab="professional" />;
}
