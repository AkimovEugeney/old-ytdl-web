import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { parseYouTubeUrl, looksLikeUrl } from "../lib/youtube.ts";
import { isTooLong, MAX_DURATION_SECONDS, formatDuration } from "../lib/limits.ts";
import { signDownload } from "../lib/sign.ts";

test("parseYouTubeUrl: поддерживаемые формы", () => {
  const id = "jNQXAC9IVRw";
  const want = { videoId: id, url: `https://www.youtube.com/watch?v=${id}` };
  for (const u of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?v=${id}&list=PL1&t=30s`,
    `http://youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `youtube.com/watch?v=${id}`,
    `  youtu.be/${id}  `,
  ]) {
    assert.deepEqual(parseYouTubeUrl(u), want, u);
  }
});

test("parseYouTubeUrl: чужие домены и мусор отклоняются (SSRF/подмена)", () => {
  for (const u of [
    "",
    "hello world",
    "https://evil.com/watch?v=jNQXAC9IVRw",
    "https://youtube.com.evil.com/watch?v=jNQXAC9IVRw",
    "https://evil.com/?u=https://youtube.com/watch?v=jNQXAC9IVRw",
    "http://127.0.0.1/watch?v=jNQXAC9IVRw",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch?v=jNQXAC9IVRw%0d%0a",
    "https://youtu.be/",
    "https://www.youtube.com/playlist?list=PL123",
    "x".repeat(600),
  ]) {
    assert.equal(parseYouTubeUrl(u), null, u);
  }
});

test("looksLikeUrl отличает ссылку от поискового запроса", () => {
  assert.equal(looksLikeUrl("https://youtu.be/jNQXAC9IVRw"), true);
  assert.equal(looksLikeUrl("youtube.com/watch?v=jNQXAC9IVRw"), true);
  assert.equal(looksLikeUrl("me at the zoo"), false);
  assert.equal(looksLikeUrl("youtube обзор"), false);
});

test("лимит 1:00 — граница включительно", () => {
  assert.equal(MAX_DURATION_SECONDS, 3600);
  assert.equal(isTooLong(3600), false);
  assert.equal(isTooLong(3601), true);
  assert.equal(isTooLong(0), false);
  assert.equal(isTooLong(undefined), false);
  assert.equal(formatDuration(3600), "1:00:00");
  assert.equal(formatDuration(65), "1:05");
});

test("подпись совпадает с форматом бэкенда (job|format|url|exp)", () => {
  const claim = { jobId: "j1", formatId: "video_720", url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", exp: 1900000000 };
  const expected = createHmac("sha256", "s3cret").update("j1|video_720|https://www.youtube.com/watch?v=jNQXAC9IVRw|1900000000").digest("hex");
  assert.equal(signDownload(claim, "s3cret"), expected);
});
