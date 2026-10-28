import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer, Header } from "@/components/SiteChrome";
import { Metrica } from "@/components/Metrica";
import { YandexAds } from "@/components/YandexAds";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const viewport: Viewport = { themeColor: "#0b0b10", width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Скачать видео с YouTube онлайн бесплатно — ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Скачать видео с YouTube онлайн: вставьте ссылку или найдите ролик по названию. MP4 до 720p, аудио, без регистрации и программ. Ролики до 1 часа.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ru_RU", siteName: SITE_NAME, url: SITE_URL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <Metrica />
        <YandexAds />
      </body>
    </html>
  );
}
