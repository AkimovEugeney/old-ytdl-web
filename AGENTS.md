# ytdl-web — памятка для ИИ-агентов

Next.js 16 (App Router, TS) сайт «скачать видео с YouTube» под Vercel. Работает поверх бэкенда `../ytdl-service-back` (FastAPI + yt-dlp), который параллельно обслуживает Android-приложение `../purple-ytdownload` (RuStore: `com.anonymous.ytdownloader`). Язык общения с владельцем и всех текстов сайта — русский.

## Жёсткие правила
- **Не ломать бэкенд Android-приложения.** Любые правки бэкенда должны срабатывать только на запросах с `web_sig`. Запросы без подписи идут по прежней логике (Bearer, подписка, суточный лимит).
- Не печатать и не коммитить секреты (`.env` в `.gitignore`). Значения читать/передавать внутри команды, в чат не выводить.
- Не коммитить, не пушить, не деплоить без явной просьбы владельца.
- Ничего не утверждать про работу без проверки. Реальное скачивание по подписанной ссылке на боевом бэкенде **ещё не проверено** (см. TODO).

## Что сделано
**Продукт:** одно поле — ссылка YouTube или поисковый запрос. Форматы на сайте: MP4 **480–720p**, аудио только **WEBM** (без перекодирования) — константы `WEB_MAX_HEIGHT`/`WEB_AUDIO_EXTS` в `lib/server/backend.ts`; 1080p и M4A — платные, только в приложении (чтобы сайт не отбирал продажи). `/api/prepare` отклоняет форматы вне списка. Бесплатно, без регистрации, без оплат.
**Лимит:** ролик **не длиннее 1 часа** (`lib/limits.ts`, `MAX_DURATION_SECONDS = 3600`). Текст пользователю: «Видео длиннее часа. Более часа скачать нельзя.» Проверяется трижды: `/api/info`, `/api/prepare`, и на бэкенде в `/download` (`WEB_MAX_DURATION_SEC`, если длительность не определена — отказ 403).

**Поток скачивания:**
1. `POST /api/info` → бэкенд `/info` (Bearer-токен только на сервере Vercel).
2. `POST /api/prepare` → повторная проверка длительности и формата, `HEAD /download` на бэкенд (запускает подготовку), возвращает `downloadUrl` с HMAC-подписью (`web_sig`, `web_exp`, `web_name`), **TTL 20 минут** (`LINK_TTL_SEC`).
3. `GET /api/progress?jobId=` → прогресс подготовки (Strategy B).
4. Браузер качает файл **напрямую с бэкенда** по подписанной ссылке (трафик не идёт через Vercel).
Формат подписи: `jobId|formatId|url|exp`, HMAC-SHA256 hex. Должен совпадать в `lib/sign.ts` и `ytdl-service-back/app/web_download.py`. Кросс-проверка Node↔Python выполнена.

**Защита `/api/*`:** только same-site (`isSameSiteRequest`: Origin/Referer/Sec-Fetch-Site); валидация URL (`parseYouTubeUrl`, только домены YouTube), `formatId` по regex, `jobId` — UUID; rate limit (`lib/server/http.ts`): Upstash Redis REST (INCR+EXPIRE NX), fallback — память инстанса; суточный лимит `PREPARE_DAILY_LIMIT` = **5 скачиваний/сутки на IP** (считается в `/api/prepare` после всех проверок; пользователю показывается в тексте на главной, FAQ, terms и под полем ввода — при смене числа обновить тексты). IP хранится только как хэш.
Не закрывается принципиально: скрипт с подделанными заголовками всё ещё может получать ссылки на ролики до часа (ограничено лимитами).

**Бэкенд (`ytdl-service-back`, ветка `stable`, коммит `482df8b`, запушен):** `app/web_download.py` (проверка подписи, `WebDispositionMiddleware` — чистый ASGI, трогает только `GET /download` с `web_sig=`), `app/auth.py` (подписанный GET /download проходит без Bearer), `server.py` (лимит длительности, отключён суточный лимит для подписанных, `Content-Disposition: attachment`), `.env.example` (`WEB_DOWNLOAD_SECRET`).

**SEO:** главная + 5 посадочных (`lib/landings.ts`: mp4, музыка, на телефон, 1080p, shorts), `/faq`, JSON-LD (FAQPage, Breadcrumb, WebApplication), `sitemap.xml`, `robots.txt`, canonical, OG, верификация Яндекс/Google через env. Ключи подбирались по выдаче, не по Вордстату.
**Юр. страницы:** `/terms`, `/privacy`, `/copyright` — скопированы из Android-версии без данных об авторе и оплат; оставлены аналитика, реклама, ответственность авторов за права, «не связаны с YouTube». Это шаблоны, юристом не проверялись.
**UI:** инфо-подсказки «i» (`InfoTip`, hover/focus/tap), 6 карточек, иконки (`app/icon.svg`, `app/apple-icon.tsx`).
**RuStore:** ссылка в шапке и плашке, большой блок `AppPromo` (на главной под 6 карточками, на посадочных под полем), мини-баннер после старта скачивания. Клики → цели Метрики `rustore_click_home|landing|after_download` (`RuStoreLink`).
**Реклама:** РСЯ автоблоки (page-id 20238177, сайт purplesave.ru) — `components/YandexAds.tsx`, подключается в `layout.tsx`, включается `NEXT_PUBLIC_ADS_ENABLED=true` (на Vercel сейчас `false`). `AdSlot` остаётся пустым: автоблоки встают сами. После включения проверить вёрстку и что блоки не перекрывают подсказки/кнопки.
**Метрика:** `components/Metrica.tsx`, включается `NEXT_PUBLIC_YM_ID`.

**Vercel:** проект `purple-web` (team `purple-25a3`), привязан (`.vercel/`). В Production загружены из `.env` 11 переменных (BACKEND_URL, BACKEND_TOKEN, BACKEND_PUBLIC_URL, DOWNLOAD_SIGNING_SECRET, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SITE_NAME, NEXT_PUBLIC_YANDEX_VERIFICATION, NEXT_PUBLIC_ADS_ENABLED, UPSTASH_*, PREPARE_DAILY_LIMIT). Пустые, не загруженные: `NEXT_PUBLIC_YM_ID`, `NEXT_PUBLIC_GOOGLE_VERIFICATION`, `NEXT_PUBLIC_CONTACT_EMAIL`. Загрузка из файла — цикл `vercel env add NAME production` (значения не печатать).

## TODO (по приоритету)
1. **Бэкенд на сервере** (`/opt/myapp`): добавить `WEB_DOWNLOAD_SECRET` в `.env` (= `DOWNLOAD_SIGNING_SECRET` на Vercel), `bash deploy.sh` (делает `docker compose down` → кратковременный простой приложения). Проверить логи `yt-server` и что Android скачивает как раньше.
2. `vercel --prod` (после загрузки переменных; `NEXT_PUBLIC_*` вшиваются при сборке).
3. **Реальный тест скачивания**: аудио и видео короткого ролика через сайт; ролик >1 ч должен давать отказ. Проверить, что nginx не теряет `Content-Disposition` при `X-Accel-Redirect`. Известный нюанс: прямой `/file?job_id=…` на проде отдавал 500 — сайт его не использует, скачивание идёт через `/download`.
4. Проверить Upstash на реальной базе (был только мок): >20 поисков/мин → 429; убедиться, что `EXPIRE … NX` принят.
5. Домен: подключить в Vercel, обновить `NEXT_PUBLIC_SITE_URL`, выбрать www/без www, Redeploy; проверить `/sitemap.xml`, `/robots.txt`.
6. Яндекс Вебмастер + Google Search Console (коды верификации, отправка sitemap); счётчик Метрики → `NEXT_PUBLIC_YM_ID`, создать JS-цели `rustore_click_*`.
7. Заполнить `NEXT_PUBLIC_CONTACT_EMAIL`, заменить заглушку `NEXT_PUBLIC_SITE_NAME` («Purple Download»), посмотреть сайт глазами в браузере (вёрстка, подсказки, блок RuStore, iOS Safari не проверялись — браузер-тула не было).
8. Реклама: выбрать сеть (проверить, принимает ли ниша), вставить код в `AdSlot`, включить флаг. При Вебвизоре — дописать в `/privacy`.
9. Скрыть адрес бэкенда: обсуждался Cloudflare (proxy/Tunnel) с нейтральным поддоменом `dl.<домен>` → `BACKEND_PUBLIC_URL`; код менять не нужно. Прогон файлов через Vercel сознательно не делаем (трафик/лимиты). Условия Cloudflare для больших видеофайлов не проверялись.
10. Юр. тексты показать юристу; Vercel Hobby запрещает коммерческое использование — при рекламе нужен Pro (условия перечитать).
11. `ytdl-web` пока не git-репозиторий — создать репозиторий при необходимости.

## Команды
```bash
npm run dev | build | typecheck | test     # тесты: node --test + strip-types (5 шт.)
vercel --prod
```
Windows/git-bash: `pkill` нет — процессы по порту: `netstat -ano | grep :PORT`, `taskkill /PID <pid> /F`. Временные файлы — в `$TMPDIR`, не в `/tmp`.

## Ограничения сервиса (не обещать больше)
Нет 1080p/4K/2K, M4A и MP3 на сайте, нет плейлистов. Тексты сайта не должны обещать 1080p/M4A, кроме фраз «доступно в приложении». Список доступных форматов зависит от ролика (иногда video пустой, остаётся аудио).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
