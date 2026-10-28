"use client";

import { useRef, useState } from "react";
import { formatDuration } from "@/lib/limits";
import { track } from "@/lib/analytics";
import { looksLikeUrl } from "@/lib/youtube";
import { InfoTip } from "./InfoTip";
import { LimitPromo } from "./LimitPromo";
import { RuStoreLink } from "./RuStoreLink";

type Fmt = { id: string; kind: "video" | "audio"; label: string };
type Info = {
  videoId: string;
  url: string;
  title: string;
  duration: number;
  thumbnail: string;
  tooLong: boolean;
  message?: string;
  formats: Fmt[];
};
type Item = { videoId: string; url: string; title: string; uploader: string; duration: number; thumbnail: string; tooLong: boolean };

async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Что-то пошло не так. Попробуйте ещё раз.") as Error & { code?: string };
    err.code = data?.error;
    throw err;
  }
  return data as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Downloader() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [preparing, setPreparing] = useState<string | null>(null); // id формата
  const [percent, setPercent] = useState(0);
  const [done, setDone] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const runId = useRef(0);

  const reset = () => {
    setError(null);
    setInfo(null);
    setItems(null);
    setDone(false);
    setLimitHit(false);
    setPreparing(null);
    setPercent(0);
  };

  async function loadInfo(url: string) {
    reset();
    setBusy(true);
    const id = ++runId.current;
    try {
      const data = await api<Info>("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (id === runId.current) {
        setInfo(data);
        track(data.tooLong ? "too_long_blocked" : "info_loaded");
      }
    } catch (e) {
      if (id === runId.current) {
        setError((e as Error).message);
        track("info_error");
      }
    } finally {
      if (id === runId.current) setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q || busy) return;
    if (looksLikeUrl(q)) {
      track("link_submit");
      return loadInfo(q);
    }
    track("search_submit");

    reset();
    setBusy(true);
    const id = ++runId.current;
    try {
      const data = await api<{ items: Item[] }>(`/api/search?q=${encodeURIComponent(q)}`);
      if (id !== runId.current) return;
      if (data.items.length === 0) setError("Ничего не найдено. Попробуйте изменить запрос.");
      setItems(data.items);
    } catch (err) {
      if (id === runId.current) setError((err as Error).message);
    } finally {
      if (id === runId.current) setBusy(false);
    }
  }

  async function startDownload(fmt: Fmt) {
    if (!info || preparing) return;
    setError(null);
    setDone(false);
    setPercent(0);
    setPreparing(fmt.id);
    track("download_click", { kind: fmt.kind });
    try {
      const prep = await api<{ jobId: string; needsPreparation: boolean; downloadUrl: string }>("/api/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: info.url, formatId: fmt.id }),
      });

      let fileUrl = prep.downloadUrl;
      if (prep.needsPreparation) {
        const deadline = Date.now() + 10 * 60_000;
        for (;;) {
          await sleep(2000);
          if (Date.now() > deadline) throw new Error("Подготовка файла заняла слишком много времени. Попробуйте ещё раз.");
          let p: { status: string; percent: number; message?: string; downloadUrl?: string };
          try {
            // Таймаут: зависший запрос не должен останавливать опрос; временные сбои пропускаем
            p = await api(`/api/progress?jobId=${prep.jobId}`, { signal: AbortSignal.timeout(20_000) });
          } catch (err) {
            if ((err as Error & { code?: string }).code) throw err;
            continue;
          }
          setPercent(p.percent);
          if (p.status === "failed") throw new Error(p.message || "Не удалось подготовить файл.");
          if (p.status === "completed") {
            if (p.downloadUrl) fileUrl = p.downloadUrl;
            break;
          }
        }
      }

      // Файл отдаётся с Content-Disposition: attachment — страница не перезагружается.
      window.location.assign(fileUrl);
      setDone(true);
      track("download_started", { kind: fmt.kind });
    } catch (e) {
      const code = (e as Error & { code?: string }).code;
      if (code === "daily_limit") {
        setLimitHit(true);
        track("daily_limit_hit");
      } else {
        setError((e as Error).message);
        track("download_error", { kind: fmt.kind });
      }
    } finally {
      setPreparing(null);
    }
  }

  const video = info?.formats.filter((f) => f.kind === "video") ?? [];
  const audio = info?.formats.filter((f) => f.kind === "audio") ?? [];

  return (
    <div>
      <form className="search" onSubmit={onSubmit} role="search">
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Вставьте ссылку на видео YouTube или введите название"
          aria-label="Ссылка на видео YouTube или поисковый запрос"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn" type="submit" disabled={busy || !value.trim()}>
          {busy ? "Ищем…" : "Найти"}
        </button>
      </form>

      <div className="hint">
        <span className="limit-line">До 1 часа видео · 5 скачиваний в день</span>
        <span className="limit-line">
          Нужно больше? <RuStoreLink place="limit_hint">Приложение для Android →</RuStoreLink>
        </span>
        <span className="legal-line">
          <span>Контент, защищённый авторским правом, недоступен для скачивания через этот сервис.</span>
        <InfoTip label="Условия использования" align="right">
          Нажимая «Скачать», вы подтверждаете, что аудио- и видеоконтент загружается только для личного некоммерческого
          использования. Вы обязуетесь не распространять, не копировать, не изменять и не использовать скачанный контент в
          коммерческих целях, включая перепродажу, публичное исполнение и трансляцию. Использование контента за пределами
          этих условий может нарушать законодательство об авторском праве и правила YouTube. Мы не несём ответственности
          за неправомерное использование контента — пользователь самостоятельно отвечает за соблюдение законов и
          договорных обязательств.
        </InfoTip>
        </span>
      </div>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {items && items.length > 0 && (
        <div className="list" aria-live="polite">
          {items.map((it) => (
            <button
              key={it.videoId}
              type="button"
              className="item"
              disabled={it.tooLong}
              title={it.tooLong ? "Видео длиннее 1 часа — скачать нельзя" : undefined}
              onClick={() => {
                setValue(it.url);
                loadInfo(it.url);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.thumbnail} alt="" loading="lazy" width={128} height={72} />
              <span>
                <span className="t">{it.title}</span>
                <span className="s">
                  {it.uploader && `${it.uploader} · `}
                  {it.duration > 0 ? formatDuration(it.duration) : ""}
                  {it.tooLong && " · длиннее 1 часа"}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {info && (
        <div className="result" aria-live="polite">
          <div className="video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={info.thumbnail} alt="" width={168} height={94} />
            <div className="meta">
              <div className="title">{info.title}</div>
              <div className="dur">Длительность: {formatDuration(info.duration)}</div>
            </div>
          </div>

          {info.tooLong ? (
            <div className="error">{info.message}</div>
          ) : (
            <>
              {video.length > 0 && <p className="group-title">Видео · MP4</p>}
              <div className="formats">
                {video.map((f) => (
                  <FormatButton key={f.id} f={f} active={preparing === f.id} disabled={!!preparing} onClick={() => startDownload(f)} />
                ))}
              </div>
              {audio.length > 0 && <p className="group-title">Только звук</p>}
              <div className="formats">
                {audio.map((f) => (
                  <FormatButton key={f.id} f={f} active={preparing === f.id} disabled={!!preparing} onClick={() => startDownload(f)} />
                ))}
              </div>
              {info.formats.length === 0 && <div className="error">Для этого видео нет доступных форматов.</div>}

              {preparing && (
                <div aria-live="polite">
                  <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                    <div style={{ width: `${Math.max(5, percent)}%` }} />
                  </div>
                  <p className="dur" style={{ marginTop: 8 }}>
                    Готовим файл{percent > 0 ? `… ${percent}%` : "…"} Не закрывайте страницу.
                  </p>
                </div>
              )}
              {limitHit && <LimitPromo />}
              {done && (
                <>
                  <p className="ok">Загрузка началась. Проверьте папку «Загрузки».</p>
                  <div className="promo-mini">
                    Скачиваете часто? Установите <strong>приложение для Android</strong> —{" "}
                    <RuStoreLink place="after_download">скачать в RuStore</RuStoreLink>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FormatButton({ f, active, disabled, onClick }: { f: Fmt; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="fmt" disabled={disabled} onClick={onClick}>
      {f.label}
      <small>{active ? "Подготовка…" : "Скачать"}</small>
    </button>
  );
}
