"use client";

declare global {
  interface Window {
    ym?: (id: number, method: string, goal: string, params?: Record<string, unknown>) => void;
  }
}

/** Цель Яндекс Метрики. Тихо ничего не делает, если счётчик не подключён. */
export function track(goal: string, params?: Record<string, string | number | boolean>) {
  try {
    const id = Number(process.env.NEXT_PUBLIC_YM_ID);
    if (id && typeof window !== "undefined" && window.ym) window.ym(id, "reachGoal", goal, params);
  } catch {}
}
