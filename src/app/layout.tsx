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
  title: "Siemens WinCC Log & Storage Architect",
  description: "Comprehensive engineering sizing and validation for Siemens WinCC Unified, Comfort & Professional Data Logs, Alarm Logs, and Audit Trail in TIA Portal.",
  keywords: ["Siemens", "TIA Portal", "WinCC Unified", "Data Log", "Log Size Calculator", "SIMATIC Comfort Panel", "WinCC Professional", "SQLite", "MS SQL"],
  authors: [{ name: "M-Galymzhan" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}>
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
