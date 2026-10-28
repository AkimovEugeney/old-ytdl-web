"use client";

import { useEffect, useId, useRef, useState } from "react";

/** Иконка «i» с всплывающим блоком: по наведению (десктоп), фокусу (клавиатура) и тапу (мобильные). */
export function InfoTip({ children, label = "Подробнее", align = "center" }: { children: React.ReactNode; label?: string; align?: "center" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className={`tip${open ? " open" : ""}`} ref={ref}>
      <button type="button" className="tip-btn" aria-label={label} aria-describedby={id} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        i
      </button>
      <span role="tooltip" id={id} className={`tip-body${align === "right" ? " right" : ""}`}>
        {children}
      </span>
    </span>
  );
}
