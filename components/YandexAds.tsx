import Script from "next/script";
import { ADS_ENABLED } from "@/lib/site";

// Автоматические блоки Рекламной сети Яндекса (autoplacement). ID страницы не секретный.
const PAGE_ID = (process.env.NEXT_PUBLIC_YANDEX_ADS_PAGE_ID ?? "20238177").trim();

export function YandexAds() {
  if (!ADS_ENABLED || !/^\d+$/.test(PAGE_ID)) return null;
  return (
    <>
      <Script id="ya-ads-context" src="https://yandex.ru/ads/system/context.js" strategy="afterInteractive" />
      <Script id="ya-ads-loader" src="https://yandex.ru/ads/system/ap-loader.js" data-page-id={PAGE_ID} strategy="afterInteractive" />
    </>
  );
}
