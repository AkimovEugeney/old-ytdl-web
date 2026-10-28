import { randomUUID } from "node:crypto";
import { backendConfig, backendFetch, normalizeInfo } from "@/lib/server/backend";
import { forbiddenOrigin, isSameSiteRequest, jsonError, mapBackendFailure, mapBackendStatus, rateLimited, visitorId } from "@/lib/server/http";
import { isTooLong } from "@/lib/limits";
import { signDownload } from "@/lib/sign";
import { parseYouTubeUrl } from "@/lib/youtube";
import { SAVENOW_PREFIX, savenowCreate, savenowEnabled, savenowFormat } from "@/lib/server/savenow";

export const runtime = "nodejs";
export const maxDuration = 60;

const FORMAT_RE = /^(video_\d{3,4}|audio_\d{2,4})$/;
const LINK_TTL_SEC = 20 * 60;
const DAILY_LIMIT = Math.max(1, Number(process.env.PREPARE_DAILY_LIMIT ?? 5) || 5);

export async function POST(req: Request) {
  if (!isSameSiteRequest(req)) return forbiddenOrigin();
  if (await rateLimited(req, "prepare", 10)) return jsonError(429, "rate_limit", "Слишком много запросов. Подождите минуту.");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "bad_json", "Некорректный запрос.");
  }

  const parsed = parseYouTubeUrl(String(body?.url ?? ""));
  const formatId = String(body?.formatId ?? "");
  if (!parsed) return jsonError(400, "bad_url", "Вставьте корректную ссылку на видео YouTube.");
  if (!FORMAT_RE.test(formatId)) return jsonError(400, "bad_format", "Неизвестный формат.");

  try {
    const cfg = backendConfig();
    if (!cfg.secret) return jsonError(503, "not_configured", "Сервис временно недоступен. Попробуйте позже.");

    // Ограничение длительности проверяем на сервере заново — клиенту не доверяем.
    const infoRes = await backendFetch(`/info?url=${encodeURIComponent(parsed.url)}`, { userId: visitorId(req) });
    if (!infoRes.ok) return await mapBackendStatus(infoRes);
    const info = normalizeInfo(await infoRes.json());
    if (!info) return jsonError(502, "bad_backend_payload", "Не удалось получить данные о видео.");
    if (isTooLong(info.duration)) {
      return jsonError(422, "too_long", `Видео длиннее часа. Более часа скачать нельзя.`);
    }
    if (!info.formats.some((f) => f.id === formatId)) {
      return jsonError(400, "bad_format", "Этот формат недоступен для видео.");
    }

    // Суточный лимит: считаем только реальные запуски подготовки (после всех проверок)
    if (await rateLimited(req, "prepare-day", DAILY_LIMIT, 24 * 60 * 60_000)) {
      return jsonError(429, "daily_limit", `Лимит исчерпан: на сайте можно скачать не более ${DAILY_LIMIT} файлов в день. Попробуйте завтра или установите приложение для Android.`);
    }

    // ВРЕМЕННО: если задан SAVENOW_API_KEY — готовим файл через SaveNow (ссылка придёт из /api/progress).
    if (savenowEnabled()) {
      const format = savenowFormat(formatId);
      if (!format) return jsonError(400, "bad_format", "Неизвестный формат.");
      const id = await savenowCreate(parsed.url, format);
      if (!id) return jsonError(502, "prepare_failed", "Не удалось подготовить файл. Попробуйте другой формат или позже.");
      return Response.json(
        { jobId: SAVENOW_PREFIX + id, needsPreparation: true, downloadUrl: "" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const jobId = randomUUID();
    const head = await backendFetch(
      `/download?url=${encodeURIComponent(parsed.url)}&format_id=${formatId}&job_id=${jobId}`,
      { method: "HEAD", userId: visitorId(req) },
    );
    if (!head.ok) {
      if (head.status === 429) return jsonError(429, "busy", "Сервис перегружен. Повторите через минуту.");
      return jsonError(502, "prepare_failed", "Не удалось подготовить файл. Попробуйте другой формат или позже.");
    }

    const exp = Math.floor(Date.now() / 1000) + LINK_TTL_SEC;
    const sig = signDownload({ jobId, formatId, url: parsed.url, exp }, cfg.secret);
    const qs = new URLSearchParams({
      url: parsed.url,
      format_id: formatId,
      job_id: jobId,
      web_exp: String(exp),
      web_sig: sig,
      web_name: info.title.slice(0, 120),
    });

    return Response.json(
      {
        jobId,
        // Strategy B: файл готовится на сервере — нужно ждать /api/progress. Иначе (A) стартуем сразу.
        needsPreparation: head.headers.get("x-strategy") === "B",
        downloadUrl: `${cfg.publicBase}/download?${qs.toString()}`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return mapBackendFailure(e);
  }
}
