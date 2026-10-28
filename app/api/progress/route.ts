import { backendFetch } from "@/lib/server/backend";
import { SAVENOW_ID_RE, SAVENOW_PREFIX, savenowEnabled, savenowProgress } from "@/lib/server/savenow";
import { forbiddenOrigin, isSameSiteRequest, jsonError, mapBackendFailure, rateLimited } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  if (!isSameSiteRequest(req)) return forbiddenOrigin();
  if (await rateLimited(req, "progress", 120)) return jsonError(429, "rate_limit", "Слишком много запросов.");

  const jobId = new URL(req.url).searchParams.get("jobId") ?? "";
  if (savenowEnabled() && SAVENOW_ID_RE.test(jobId)) {
    try {
      const p = await savenowProgress(jobId.slice(SAVENOW_PREFIX.length));
      return Response.json(
        { ...p, message: p.status === "failed" ? "Не удалось подготовить файл. Попробуйте ещё раз или выберите другой формат." : undefined },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (e) {
      return mapBackendFailure(e);
    }
  }
  if (!UUID_RE.test(jobId)) return jsonError(400, "bad_job", "Некорректный идентификатор задачи.");

  try {
    const res = await backendFetch(`/progress/${jobId}`, { timeoutMs: 15_000 });
    // 202 + {} — задача ещё не зарегистрирована в бэкенде
    if (res.status === 202 || res.status === 404) {
      return Response.json({ status: "waiting", percent: 0 }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!res.ok) return jsonError(502, "progress_failed", "Не удалось узнать прогресс.");

    const d: any = await res.json();
    const status = String(d?.status ?? "processing").toLowerCase();
    const failed = status === "failed" || status === "error" || status === "canceled";
    return Response.json(
      {
        status: failed ? "failed" : status === "completed" ? "completed" : "processing",
        percent: Math.max(0, Math.min(100, Number(d?.percent) || 0)),
        totalBytes: typeof d?.total_bytes === "number" ? d.total_bytes : null,
        message: failed ? "Не удалось подготовить файл. Попробуйте ещё раз или выберите другой формат." : undefined,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return mapBackendFailure(e);
  }
}
