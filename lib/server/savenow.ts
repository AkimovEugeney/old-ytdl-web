import "server-only";

// ВРЕМЕННО: SaveNow вместо собственного бэкенда. Включается, только если задан SAVENOW_API_KEY.
// Ключ живёт только в серверном env; в браузер уходят jobId и готовая ссылка файла.
const API = "https://p.savenow.to/ajax";
export const SAVENOW_PREFIX = "sn-";
export const SAVENOW_ID_RE = /^sn-[A-Za-z0-9_-]{8,80}$/;

export function savenowKey(): string {
  return (process.env.SAVENOW_API_KEY ?? "").trim();
}
export const savenowEnabled = () => savenowKey() !== "";

/** video_720 -> "720"; audio_* -> "mp3" (SaveNow не отдаёт webm). */
export function savenowFormat(formatId: string): string | null {
  const m = /^video_(\d{3,4})$/.exec(formatId);
  if (m) return Number(m[1]) <= 360 ? "360" : "720"; // сайт ограничен 720p
  return /^audio_/.test(formatId) ? "mp3" : null;
}

function safeDownloadUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  try {
    const x = new URL(u);
    return x.protocol === "https:" && (x.hostname === "savenow.to" || x.hostname.endsWith(".savenow.to")) ? x.toString() : null;
  } catch {
    return null;
  }
}

/** Создаёт платную задачу. Возвращает id или null (деньги списываются только при выданном id). */
export async function savenowCreate(url: string, format: string): Promise<string | null> {
  const qs = new URLSearchParams({ url, format, apikey: savenowKey(), no_merge: "0", allow_extended_duration: "0" });
  const res = await fetch(`${API}/download.php?${qs}`, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) return null;
  const d: any = await res.json().catch(() => null);
  return d?.success && typeof d.id === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(d.id) ? d.id : null;
}

export type SavenowProgress =
  | { status: "processing"; percent: number }
  | { status: "completed"; percent: 100; downloadUrl: string }
  | { status: "failed"; percent: number };

export async function savenowProgress(id: string): Promise<SavenowProgress> {
  const res = await fetch(`${API}/progress.php?${new URLSearchParams({ id })}`, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error("savenow progress " + res.status);
  const d: any = await res.json();
  const progress = Number(d?.progress) || 0;
  if (progress < 1000) return { status: "processing", percent: Math.min(99, Math.round(progress / 10)) };
  const url = d?.success === 1 || d?.success === true ? safeDownloadUrl(d?.download_url) : null;
  return url ? { status: "completed", percent: 100, downloadUrl: url } : { status: "failed", percent: 100 };
}
