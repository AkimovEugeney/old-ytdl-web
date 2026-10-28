import { RuStoreLink } from "./RuStoreLink";

/** Показывается, когда исчерпан суточный лимит сайта: мягко ведёт в приложение. */
export function LimitPromo() {
  return (
    <div className="promo-mini" role="status">
      <strong>На сегодня лимит сайта исчерпан.</strong> Попробуйте приложение для Android: там Full HD 1080p,
      аудио M4A и общая галерея файлов.
      <div style={{ marginTop: 10 }}>
        <RuStoreLink place="limit" className="btn promo-btn" >
          Скачать в RuStore
        </RuStoreLink>
      </div>
    </div>
  );
}
