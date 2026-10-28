import { ADS_ENABLED } from "@/lib/site";

/**
 * Рекламный слот. Пока реклама не подключена (NEXT_PUBLIC_ADS_ENABLED != "true")
 * не рендерит ничего. Код сети (РСЯ и т.п.) вставим вместе — сюда, в одно место.
 */
export function AdSlot({ id }: { id: string }) {
  if (!ADS_ENABLED) return null;
  return (
    <aside className="ad-slot" data-ad-slot={id} aria-label="Реклама">
      {/* TODO: код рекламного блока */}
    </aside>
  );
}
