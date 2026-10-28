"use client";

import { track } from "@/lib/analytics";
import { RUSTORE_URL } from "@/lib/rustore";

/** Ссылка на RuStore + цель Яндекс Метрики «rustore_click» (place — где кликнули). */
export function RuStoreLink({ place, className, children }: { place: string; className?: string; children: React.ReactNode }) {
  const onClick = () => {
    track("rustore_click", { place });
    track(`rustore_click_${place}`);
  };
  return (
    <a href={RUSTORE_URL} target="_blank" rel="noopener" className={className} onClick={onClick}>
      {children}
    </a>
  );
}
