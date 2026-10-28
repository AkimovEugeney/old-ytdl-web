/** Максимальная длительность ролика для скачивания: 1 час. */
export const MAX_DURATION_SECONDS = 60 * 60;

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function isTooLong(durationSeconds: number | null | undefined): boolean {
  return typeof durationSeconds === "number" && durationSeconds > MAX_DURATION_SECONDS;
}
