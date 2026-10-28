import { backendFetch } from "@/lib/server/backend";
import { forbiddenOrigin, isSameSiteRequest, jsonError, mapBackendFailure, mapBackendStatus, rateLimited, visitorId } from "@/lib/server/http";
import { isTooLong } from "@/lib/limits";
import { thumbnailUrl } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isSameSiteRequest(req)) return forbiddenOrigin();
  if (await rateLimited(req, "search", 20)) return jsonError(429, "rate_limit", "Слишком много запросов. Подождите минуту.");

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 150);
  if (q.length < 2) return jsonError(400, "bad_query", "Введите хотя бы два символа.");

  try {
    const res = await backendFetch(`/search?query=${encodeURIComponent(q)}&limit=12`, { userId: visitorId(req) });
    if (!res.ok) return await mapBackendStatus(res);
    const data: any = await res.json();
    const raw: any[] = Array.isArray(data?.videos) ? data.videos : [];

    const items = raw
      .filter((v) => typeof v?.id === "string" && /^[A-Za-z0-9_-]{11}$/.test(v.id))
      .map((v) => {
        const duration = Number(v.duration) || 0;
        return {
          videoId: v.id as string,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          title: String(v.title ?? "Видео"),
          uploader: typeof v.uploader === "string" ? v.uploader : "",
          duration,
          thumbnail: thumbnailUrl(v.id),
          tooLong: isTooLong(duration),
        };
      });

    return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return mapBackendFailure(e);
  }
}
