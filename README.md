# ytdl-web

Next.js (App Router) сайт для скачивания видео с YouTube поверх `ytdl-service-back`. Без оплаты, лимит ролика — 1 час.

## Запуск

```bash
cp .env.example .env.local   # заполнить
npm install
npm run dev                  # http://localhost:3000
npm test && npm run typecheck && npm run build
```

## Как устроено скачивание

1. `POST /api/info` — Vercel-функция запрашивает `/info` бэкенда (с Bearer-токеном, который в браузер не попадает), отбрасывает ролики длиннее 3600 с.
2. `POST /api/prepare` — повторно проверяет длительность, запускает подготовку файла (`HEAD /download`) и возвращает **подписанную** ссылку (HMAC, живёт 20 минут).
3. `GET /api/progress` — прогресс подготовки (Strategy B).
4. Браузер скачивает файл напрямую с бэкенда по подписанной ссылке (файлы не идут через Vercel — нет лимитов по размеру/времени).

Бэкенд принимает подпись вместо Bearer (`app/web_download.py`, `app/auth.py`), не применяет к ней суточный лимит и отдаёт `Content-Disposition: attachment`.

## Деплой

**Бэкенд** — добавить в `.env`: `WEB_DOWNLOAD_SECRET=<секрет>` и перезапустить.
**Vercel** — Environment Variables: `BACKEND_URL`, `BACKEND_TOKEN`, `BACKEND_PUBLIC_URL` (если отличается), `DOWNLOAD_SIGNING_SECRET` (= `WEB_DOWNLOAD_SECRET`), `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_YM_ID`, `NEXT_PUBLIC_CONTACT_EMAIL`, коды верификации Яндекса/Google.

## SEO

`/` + 5 посадочных страниц (`lib/landings.ts`), `/faq`, JSON-LD (FAQPage, BreadcrumbList, WebApplication), `sitemap.xml`, `robots.txt`, canonical, OG. После деплоя — добавить сайт в Яндекс Вебмастер и Google Search Console.

## Реклама

Слоты — `components/AdSlot.tsx` (включаются `NEXT_PUBLIC_ADS_ENABLED=true`); код сети вставим вместе.
