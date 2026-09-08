import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#00646E",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://wincc-log-architect.vercel.app"),
  title: {
    default: "Siemens WinCC Log & Storage Architect | Калькулятор архивов TIA Portal",
    template: "%s | WinCC Log Architect",
  },
  description: "Инженерный онлайн-калькулятор и валидатор хранилищ архивов Siemens SIMATIC: WinCC Unified (SQLite WAL), Comfort/Advanced (RDB/CSV), Professional (MS SQL Server). Расчет сегментов, кольцевых буферов, ресурса Flash (TBW), сети 100BASE-TX и сигнализации по ISA-18.2 / EEMUA 191.",
  keywords: [
    // Brand & Platforms
    "Siemens", "SIMATIC", "TIA Portal", "TIA Portal V19", "TIA Portal V20", "TIA Portal V18", "TIA Portal V17",
    "WinCC", "WinCC Unified", "WinCC Comfort", "WinCC Advanced", "WinCC Professional", "Unified Comfort Panel", "MTP",
    // Engine & Technologies
    "SQLite WAL", "SQLite write amplification", "RDB", "MS SQL Server", "SQL Express 10GB limit",
    "Data Log", "Alarm Log", "Audit Trail", "21 CFR Part 11", "GMP",
    // Engineering Calculations
    "калькулятор архивов WinCC", "расчет размера архива", "кольцевой буфер WinCC", "сегментация архивов",
    "Log Size Calculator", "Storage Sizing", "Flash Life", "TBW", "SIMATIC SD Card", "SD card MLFB",
    "ISA-18.2", "EEMUA 191", "Alarm flood", "интенсивность аварийных событий",
    "Industrial Ethernet bandwidth", "100BASE-TX", "S7comm", "OMS+", "OPC UA",
    // Tags & Automation
    "АСУ ТП", "SCADA", "HMI Tags export", "калькулятор тегов", "SCADA sizing"
  ],
  authors: [{ name: "M-Galymzhan", url: "https://github.com/M-Galymzhan" }],
  creator: "M-Galymzhan",
  publisher: "M-Galymzhan",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Siemens WinCC Log & Storage Architect",
    description: "Инженерный расчет и валидатор хранилищ архивов Siemens TIA Portal: WinCC Unified (SQLite), Comfort (RDB), Professional (MS SQL). Ресурс Flash-памяти и нормы ISA-18.2.",
    url: "https://wincc-log-architect.vercel.app",
    siteName: "Siemens WinCC Log & Storage Architect",
    locale: "ru_RU",
    alternateLocale: ["en_US"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Siemens WinCC Log & Storage Architect",
    description: "Инженерный калькулятор архивов Siemens WinCC Unified, Comfort и Professional для TIA Portal.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "nBx0GzmBVShlot-mQstVXw77mBRJ1eCBGgCYkDNrMDE",
    yandex: "1a5f55f8fb175a8c",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Siemens WinCC Log & Storage Architect",
  alternateName: ["WinCC Log Architect", "Siemens HMI Storage Calculator"],
  url: "https://wincc-log-architect.vercel.app",
  applicationCategory: "EngineeringApplication",
  operatingSystem: "All (Web, Windows, Linux, macOS, iOS, Android)",
  description: "Комплексный инженерный калькулятор и валидатор хранилищ архивов Siemens SIMATIC: WinCC Unified (SQLite WAL), Comfort/Advanced (RDB/CSV), Professional (MS SQL Server).",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "M-Galymzhan",
    url: "https://github.com/M-Galymzhan",
  },
  softwareVersion: "2.11.5",
  browserRequirements: "Requires JavaScript. Requires HTML5.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
