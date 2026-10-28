import { RuStoreLink } from "./RuStoreLink";

export function AppPromo({ place = "block" }: { place?: string }) {
  return (
    <section className="promo" aria-label="Приложение для Android">
      <div className="promo-icon" aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 64 64">
          <path d="M32 14v22M21 27l11 11 11-11" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 47h30" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>
      <div className="promo-text">
        <h2>Удобнее на телефоне — приложение для Android</h2>
        <ul>
          <li>Full HD 1080p и аудио M4A</li>
          <li>Без браузера: вставили ссылку и скачали за пару нажатий</li>
          <li>Все файлы в одной галерее, без браузера</li>
        </ul>
        <RuStoreLink place={place} className="btn promo-btn">
          Скачать в RuStore
        </RuStoreLink>
        <p className="promo-note">Бесплатная установка из каталога RuStore</p>
      </div>
    </section>
  );
}
