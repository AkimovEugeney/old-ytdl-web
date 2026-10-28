import "server-only";

export class BackendNotConfigured extends Error {}

function trimSlash(v: string): string {
  return v.replace(/\/+$/, "");
}

export function backendConfig() {
  const base = trimSlash((process.env.BACKEND_URL ?? "").trim());
  const token = (process.env.BACKEND_TOKEN ?? "").trim();
  const publicBase = trimSlash((process.env.BACKEND_PUBLIC_URL ?? "").trim()) || base;
  const secret = (process.env.DOWNLOAD_SIGNING_SECRET ?? "").trim();
  if (!base) throw new BackendNotConfigured("BACKEND_URL не задан");
  return { base, token, publicBase, secret };
}

export async function backendFetch(
  path: string,
  init: RequestInit & { timeoutMs?: number; userId?: string } = {},
): Promise<Response> {
  const { base, token } = backendConfig();
  const { timeoutMs = 50_000, userId, headers, ...rest } = init;
  const h = new Headers(headers);
  if (token) h.set("Authorization", `Bearer ${token}`);
  if (userId) h.set("X-User-Id", userId);
  return fetch(`${base}${path}`, {
    ...rest,
    headers: h,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/** Ограничения бесплатного сайта: выше этого — только в приложении. */
export const WEB_MAX_HEIGHT = 720;
export const WEB_AUDIO_EXTS = ["webm"];

export type VideoFormat = { id: string; kind: "video" | "audio"; label: string };

export type BackendInfo = {
  title: string;
  duration: number;
  formats: VideoFormat[];
};

/** Приводит ответ /info бэкенда к нашему формату. Флаги premium игнорируются — на сайте всё бесплатно. */
export function normalizeInfo(payload: unknown): BackendInfo | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, any>;
  const meta = root.meta ?? {};
  const safe = root.safe_formats ?? {};
  const duration = Number(meta.duration);
  if (!Number.isFinite(duration)) return null;

  const video: VideoFormat[] = (Array.isArray(safe.video) ? safe.video : [])
    .filter((f: any) => typeof f?.id === "string" && /^video_\d{3,4}$/.test(f.id) && Number(f.height) <= WEB_MAX_HEIGHT)
    .sort((a: any, b: any) => (b.height ?? 0) - (a.height ?? 0))
    .map((f: any) => ({ id: f.id, kind: "video" as const, label: `MP4 · ${f.height}p` }));

  const audio: VideoFormat[] = (Array.isArray(safe.audio) ? safe.audio : [])
    .filter((f: any) => typeof f?.id === "string" && /^audio_\d{2,4}$/.test(f.id) && WEB_AUDIO_EXTS.includes(String(f.ext ?? "").toLowerCase()))
    .map((f: any) => {
      const ext = String(f.ext ?? "").toLowerCase();
      const name = ext === "m4a" ? "M4A (AAC)" : ext === "webm" ? "WEBM (Opus)" : ext.toUpperCase() || "Аудио";
      return { id: f.id, kind: "audio" as const, label: `${name} · ${f.bitrate} кбит/с` };
    });

  return {
    title: typeof meta.title === "string" && meta.title.trim() ? meta.title.trim() : "Видео",
    duration,
    formats: [...video, ...audio],
  };
}
