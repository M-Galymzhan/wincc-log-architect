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
    languages: {
      "ru-RU": "/?lang=ru",
      "en-US": "/?lang=en",
      "x-default": "/",
    },
  },
  openGraph: {
    title: "Siemens WinCC Log & Storage Architect",
    description: "Инженерный расчет и валидатор хранилищ архивов Siemens TIA Portal: WinCC Unified (SQLite), Comfort (RDB), Professional (MS SQL). Ресурс Flash-памяти и нормы ISA-18.2.",
    url: "https://wincc-log-architect.vercel.app",
    siteName: "Siemens WinCC Log & Storage Architect",
    locale: "ru_RU",
    alternateLocale: ["en_US"],
    type: "website",
    images: [
      {
        url: "https://wincc-log-architect.vercel.app/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Siemens WinCC Log & Storage Architect — TIA Portal V14-V20 Storage Sizing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Siemens WinCC Log & Storage Architect",
    description: "Инженерный калькулятор архивов Siemens WinCC Unified, Comfort и Professional для TIA Portal.",
    images: ["https://wincc-log-architect.vercel.app/opengraph-image"],
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
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://wincc-log-architect.vercel.app/#app",
      name: "Siemens WinCC Log & Storage Architect",
      alternateName: [
        "WinCC Log Architect",
        "Siemens HMI Storage Calculator",
        "TIA Portal Archive Calculator",
        "Калькулятор архивов WinCC",
      ],
      url: "https://wincc-log-architect.vercel.app",
      applicationCategory: "EngineeringApplication",
      applicationSubCategory: "IndustrialAutomation",
      operatingSystem: "All (Web, Windows, Linux, macOS, iOS, Android)",
      description: "Комплексный инженерный калькулятор и валидатор хранилищ архивов Siemens SIMATIC: WinCC Unified (SQLite WAL), Comfort/Advanced (RDB/CSV), Professional (MS SQL Server). Расчет сегментов, кольцевых буферов, ресурса Flash (TBW) и норм ISA-18.2.",
      screenshot: "https://wincc-log-architect.vercel.app/opengraph-image",
      image: "https://wincc-log-architect.vercel.app/opengraph-image",
      softwareVersion: "2.15.2",
      inLanguage: ["ru", "en"],
      license: "https://opensource.org/licenses/MIT",
      featureList: [
        "Расчет размера сегментов и кольцевого буфера SQLite WAL для WinCC Unified (кратность 4 МБ)",
        "Валидация ограничений WinCC Comfort: лимит 500 000 строк на RDB/CSV файл и 32 ГБ FAT32",
        "Разделение тегов на Fast и Slow архивы для WinCC Professional с лимитом 10 ГБ SQL Express",
        "Мастер тегов (TIA Portal V14–V20 Inspector Hub) с 30-колоночным XLSX экспортом",
        "Анализ перегрузки оператора и лавины тревог (Alarm Flood) по ISA-18.2 / EEMUA 191",
        "Оценка времени жизни Flash-памяти (TBW, P/E циклы, фактор Write Amplification 1.5x)",
        "Оценка пропускной способности Industrial Ethernet 100BASE-TX для циклов опроса",
      ],
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
      browserRequirements: "Requires JavaScript. Requires HTML5.",
    },
    {
      "@type": "FAQPage",
      "@id": "https://wincc-log-architect.vercel.app/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Почему размер сегмента WinCC Unified кратен 4 МБ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Архивы WinCC Unified базируются на СУБД SQLite в режиме Write-Ahead Logging (WAL). Siemens выделяет дисковое пространство монолитными блоками, кратными 4 МБ, с минимальным размером сегмента 4 МБ. При циклической ротации удаляется весь старый 4 МБ файл сегмента целиком, что предотвращает фрагментацию файловой системы на картах SDHC/SDXC.",
          },
        },
        {
          "@type": "Question",
          name: "Что означает Write Amplification 1.5x в расчете Flash памяти?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "При записи каждой строки SQLite сначала фиксирует транзакцию в журнал упреждающей записи (*.wal), а затем выполняет сброс (checkpoint) в основной файл базы данных (*.db3). С учетом служебных метаданных и индексов B-tree суммарная нагрузка на flash-память в 1.5–1.8 раза превышает чистый объем полезных данных тегов.",
          },
        },
        {
          "@type": "Question",
          name: "Каковы аппаратные ограничения для панелей Comfort и RT Advanced?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Панели SIMATIC Comfort под управлением Windows CE 6.0 поддерживают карты памяти SDHC объемом не более 32 ГБ с файловой системой FAT32. Максимальное число записей в одном файле журнала RDB/CSV ограничено системным пределом 500 000 строк. При превышении этого порога требуется создавать последовательность файлов (Sequence of log files).",
          },
        },
        {
          "@type": "Question",
          name: "Как интерпретировать анализ тревог по стандарту ISA-18.2 / EEMUA 191?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Стандарт управления сигнализацией ISA-18.2 / EEMUA 191 рекомендует удерживать среднюю частоту тревог на уровне менее 6 алармов в час в нормальном технологическом режиме и не более 12 при переходных процессах. Превышение порога в 30 алармов в час классифицируется как лавина тревог (Alarm Flood), перегружающая оператора и требующая рационализации сигналов.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      "@id": "https://wincc-log-architect.vercel.app/#howto",
      name: "Как рассчитать и спроектировать архивы Siemens WinCC в TIA Portal",
      description: "Инженерная методика расчета емкости хранилища, периода ротации сегментов и износа карт памяти для проектов автоматизации.",
      step: [
        {
          "@type": "HowToStep",
          name: "Определение состава тегов и алармов",
          text: "Задайте количество технологических параметров, типы данных (Real, Int, Bool), периодичность опроса и алгоритмы сглаживания (Deadband, Swinging Door).",
        },
        {
          "@type": "HowToStep",
          name: "Выбор целевого рантайма WinCC",
          text: "Выберите WinCC Unified (SQLite WAL), Comfort/Advanced (RDB/CSV) или Professional (MS SQL Server) с учетом аппаратной платформы.",
        },
        {
          "@type": "HowToStep",
          name: "Конфигурация глубины хранения и сегментации",
          text: "Укажите требуемый срок хранения архивов (дней) и интервал сегмента (часов). Калькулятор проверит кратность 4 МБ и соответствие правилу кольцевого буфера Siemens (>= 3 сегментов).",
        },
        {
          "@type": "HowToStep",
          name: "Валидация ресурса Flash (TBW) и нагрузки по ISA-18.2",
          text: "Проверьте прогнозируемый срок службы SD/SSD накопителя с учетом типа ячеек (SLC, MLC, TLC) и убедитесь в отсутствии риска лавины тревог (Alarm Flood).",
        },
        {
          "@type": "HowToStep",
          name: "Экспорт конфигурации в TIA Portal",
          text: "Выгрузите готовый 30-колоночный XLSX файл Hmi Tags для импорта в TIA Portal V14–V20 без ручного ввода.",
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://wincc-log-architect.vercel.app/#breadcrumbs",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Главная",
          item: "https://wincc-log-architect.vercel.app",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Siemens WinCC Log & Storage Architect",
          item: "https://wincc-log-architect.vercel.app",
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} antialiased dark`} suppressHydrationWarning>
      <head>
        <meta httpEquiv="content-language" content="ru, en" />
        <link rel="help" type="text/plain" href="/llms.txt" title="LLM and AI Agent Knowledge Format" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="Full Technical Reference for LLMs" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
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
