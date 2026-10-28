import { backendFetch, normalizeInfo } from "@/lib/server/backend";
import { forbiddenOrigin, isSameSiteRequest, jsonError, mapBackendFailure, mapBackendStatus, rateLimited, visitorId } from "@/lib/server/http";
import { isTooLong } from "@/lib/limits";
import { parseYouTubeUrl, thumbnailUrl } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isSameSiteRequest(req)) return forbiddenOrigin();
  if (await rateLimited(req, "info", 20)) return jsonError(429, "rate_limit", "Слишком много запросов. Подождите минуту.");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "bad_json", "Некорректный запрос.");
  }

  const parsed = parseYouTubeUrl(String(body?.url ?? ""));
  if (!parsed) return jsonError(400, "bad_url", "Вставьте корректную ссылку на видео YouTube.");

  try {
    const res = await backendFetch(`/info?url=${encodeURIComponent(parsed.url)}`, { userId: visitorId(req) });
    if (!res.ok) return await mapBackendStatus(res);

    const info = normalizeInfo(await res.json());
    if (!info) return jsonError(502, "bad_backend_payload", "Не удалось получить данные о видео.");

    const tooLong = isTooLong(info.duration);
    return Response.json(
      {
        videoId: parsed.videoId,
        url: parsed.url,
        title: info.title,
        duration: info.duration,
        thumbnail: thumbnailUrl(parsed.videoId),
        tooLong,
        message: tooLong ? `Видео длиннее часа. Более часа скачать нельзя.` : undefined,
        formats: tooLong ? [] : info.formats,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return mapBackendFailure(e);
  }
}
