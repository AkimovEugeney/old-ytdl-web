import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { BackendNotConfigured } from "./backend";

export function jsonError(status: number, error: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

/** Анонимный стабильный идентификатор посетителя для бэкенда (хэш IP, без хранения самого IP). */
export function visitorId(req: Request): string {
  return "web-" + createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 16);
}

// Лимиты: Upstash Redis (общий для всех инстансов Vercel); без него или при сбое — в памяти инстанса.
const buckets = new Map<string, number[]>();
function memoryLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    buckets.set(key, list);
    return true;
  }
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return false;
}

async function redisLimited(key: string, max: number, windowSec: number): Promise<boolean | null> {
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? "").replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec, "NX"],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: number }[];
    const count = Number(data?.[0]?.result);
    return Number.isFinite(count) ? count > max : null;
  } catch {
    return null; // Redis недоступен — не ломаем сайт, падаем на лимит в памяти
  }
}

/** true — лимит превышен. Окно фиксированное, ключ — scope + хэш IP (сам IP не хранится). */
export async function rateLimited(req: Request, scope: string, max: number, windowMs = 60_000): Promise<boolean> {
  const ipHash = createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 16);
  const key = `rl:${scope}:${ipHash}`;
  const viaRedis = await redisLimited(key, max, Math.ceil(windowMs / 1000));
  return viaRedis ?? memoryLimited(key, max, windowMs);
}

export function mapBackendFailure(e: unknown) {
  if (e instanceof BackendNotConfigured) {
    return jsonError(503, "not_configured", "Сервис временно недоступен. Попробуйте позже.");
  }
  if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
    return jsonError(504, "timeout", "Сервер долго отвечает. Попробуйте ещё раз.");
  }
  return jsonError(502, "backend_unreachable", "Не удалось связаться с сервисом. Попробуйте позже.");
}

/** Переводит ошибку HTTP-ответа бэкенда в понятное пользователю сообщение. */
export async function mapBackendStatus(res: Response) {
  let body: any = null;
  try {
    body = await res.json();
  } catch {}
  const code = typeof body?.error_code === "string" ? body.error_code : undefined;
  const msg = typeof body?.error === "string" ? body.error : undefined;

  if (res.status === 422 && msg) return jsonError(422, code ?? "unavailable", msg);
  if (res.status === 403 && msg) return jsonError(403, "forbidden", msg);
  if (res.status === 429) return jsonError(429, "busy", "Сервис перегружен. Повторите через минуту.");
  if (res.status === 400) return jsonError(400, "bad_request", "Не удалось обработать ссылку.");
  if (res.status === 503) return jsonError(503, "unavailable", "YouTube временно не отвечает. Попробуйте ещё раз.");
  return jsonError(502, "backend_error", "Не удалось получить данные о видео. Попробуйте позже.");
}

/**
 * Принимает только запросы со страниц самого сайта (Origin/Referer/Sec-Fetch-Site).
 * Браузеры чужих сайтов такие запросы не пройдут. Это барьер от «чужих проектов»,
 * но не от скрипта, подделывающего заголовки — от него защищают лимиты и подпись.
 */
export function isSameSiteRequest(req: Request): boolean {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  const src = req.headers.get("origin") ?? req.headers.get("referer");
  if (!src) return false;
  try {
    return new URL(src).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export function forbiddenOrigin() {
  return jsonError(403, "forbidden", "Доступ только через сайт.");
}
