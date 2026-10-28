import Link from "next/link";
import { RUSTORE_URL } from "@/lib/rustore";
import { SITE_NAME } from "@/lib/site";

export function Header() {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link href="/" className="brand" style={{ textDecoration: "none" }}>
            Purple<span>Download</span>
          </Link>
          <nav className="nav" aria-label="Основная навигация">
            <a href={RUSTORE_URL} target="_blank" rel="noopener" className="nav-app">
              Приложение в RuStore
            </a>
            <Link href="/faq">Вопросы</Link>
            <Link href="/copyright">Авторские права</Link>
          </nav>
        </div>
      </header>
      <div className="notice">{SITE_NAME} — независимый бесплатный онлайн-сервис. Не связан с YouTube и Google. Есть приложение для Android —{" "}
        <a href={RUSTORE_URL} target="_blank" rel="noopener">скачать в RuStore</a>
      </div>
    </>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <nav className="links" aria-label="Документы">
          <Link href="/terms">Пользовательское соглашение</Link>
          <Link href="/privacy">Политика конфиденциальности</Link>
          <Link href="/copyright">Авторские права</Link>
          <Link href="/faq">Вопросы и ответы</Link>
        </nav>
        <p>
          Сервис предназначен для скачивания только того контента, на который у вас есть права или разрешение правообладателя.
          Авторы и владельцы контента сами несут ответственность за свои авторские права; пользователь отвечает за то, как
          использует скачанные материалы.
        </p>
        <p>
          {SITE_NAME} не связан, не аффилирован и не одобрен YouTube или Google LLC. YouTube — товарный знак Google LLC.
          Все названия и товарные знаки принадлежат их владельцам.
        </p>
        <p>© {new Date().getFullYear()} {SITE_NAME}</p>
      </div>
    </footer>
  );
}
