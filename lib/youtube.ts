// Чистые функции без зависимостей: используются и на сервере, и в браузере, и в тестах.

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
  "www.youtu.be",
]);

export type ParsedYouTube = { videoId: string; url: string };

/** Достаёт ID ролика из ссылки YouTube. Любые другие домены отклоняются. */
export function parseYouTubeUrl(input: string): ParsedYouTube | null {
  const raw = (input ?? "").trim();
  if (!raw || raw.length > 500) return null;

  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;

  const host = u.hostname.toLowerCase();
  if (!YT_HOSTS.has(host)) return null;

  let id: string | null = null;
  if (host.endsWith("youtu.be")) {
    id = u.pathname.split("/")[1] ?? null;
  } else if (u.pathname === "/watch") {
    id = u.searchParams.get("v");
  } else {
    const m = u.pathname.match(/^\/(?:shorts|live|embed|v)\/([^/?#]+)/);
    id = m ? m[1] : null;
  }

  if (!id || !ID_RE.test(id)) return null;
  // Канонический вид: без плейлистов, таймкодов и трекинг-параметров.
  return { videoId: id, url: `https://www.youtube.com/watch?v=${id}` };
}

/** Похоже ли введённое на ссылку (а не на поисковый запрос). */
export function looksLikeUrl(input: string): boolean {
  const s = (input ?? "").trim();
  if (/\s/.test(s)) return false;
  return /^https?:\/\//i.test(s) || /^(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\b/i.test(s);
}

export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
