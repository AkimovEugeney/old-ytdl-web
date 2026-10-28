import { createHmac } from "node:crypto";

export type DownloadClaim = {
  jobId: string;
  formatId: string;
  url: string;
  exp: number; // unix seconds
};

/**
 * HMAC-SHA256 подпись ссылки на скачивание.
 * Формат payload ДОЛЖЕН совпадать с app/web_download.py в бэкенде.
 */
export function signDownload(claim: DownloadClaim, secret: string): string {
  const payload = [claim.jobId, claim.formatId, claim.url, String(claim.exp)].join("|");
  return createHmac("sha256", secret).update(payload).digest("hex");
}
