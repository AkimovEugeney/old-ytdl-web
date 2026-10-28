import Link from "next/link";
import { AppPromo } from "@/components/AppPromo";
import { AdSlot } from "@/components/AdSlot";
import { Downloader } from "@/components/Downloader";
import { InfoTip } from "@/components/InfoTip";
import { MAIN_FAQ } from "@/lib/faq";
import { LANDINGS } from "@/lib/landings";
import { faqLd, JsonLd, webAppLd, websiteLd } from "@/lib/seo";

const BLOCKS = [
  {
    title: "Бесплатно и без регистрации",
    short: "Никаких аккаунтов и платежей.",
    full: "Сервис не требует регистрации, подписки или оплаты. Просто вставьте ссылку и скачайте файл. Работа сайта поддерживается за счёт рекламы.",
  },
  {
    title: "Видео до 1 часа",
    short: "До 5 скачиваний в день.",
    full: "Мы обрабатываем ролики длительностью до 1 часа. Это позволяет серверу быстро готовить файлы для всех посетителей. Более длинные видео скачать нельзя. На сайте доступно до 5 скачиваний в день; Full HD 1080p и аудио M4A доступны в приложении для Android.",
  },
  {
    title: "MP4 до 720p и аудио",
    short: "Выбирайте качество сами.",
    full: "Доступные варианты зависят от ролика: видео MP4 в качестве 480p и 720p и только звук в формате WEBM (Opus). Full HD 1080p и аудио M4A (AAC) доступны в приложении для Android.",
  },
  {
    title: "Поиск по названию",
    short: "Нет ссылки? Введите название.",
    full: "Если у вас нет ссылки, введите название ролика или исполнителя в то же поле — мы покажем список результатов, из которого можно выбрать нужное видео.",
  },
  {
    title: "Только личное использование",
    short: "Уважайте авторские права.",
    full: "Скачанный контент предназначен только для личного некоммерческого использования. Не распространяйте его и не используйте в коммерческих целях без разрешения правообладателя. Ответственность за использование лежит на пользователе.",
  },
  {
    title: "Не связаны с YouTube",
    short: "Независимый сервис.",
    full: "Наш сервис не связан, не аффилирован и не одобрен YouTube или Google LLC. YouTube — товарный знак Google LLC. Все права на видео принадлежат их авторам.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={websiteLd} />
      <JsonLd data={webAppLd} />
      <JsonLd data={faqLd(MAIN_FAQ)} />

      <div className="container">
        <section className="hero">
          <h1>Скачать видео с YouTube онлайн</h1>
          <p className="sub">Бесплатно. Без регистрации. Вставьте ссылку или введите название.</p>
        </section>

        <Downloader />

        <AdSlot id="home-top" />

        <section aria-label="Преимущества" className="cards">
          {BLOCKS.map((b) => (
            <div className="card" key={b.title}>
              <h3>
                {b.title}
                <InfoTip label={`Подробнее: ${b.title}`}>{b.full}</InfoTip>
              </h3>
              <p>{b.short}</p>
            </div>
          ))}
        </section>

        <AppPromo place="home" />

        <section className="prose">
          <h2>Как скачать видео с YouTube</h2>
          <ol>
            <li>Скопируйте ссылку на видео или Shorts из браузера либо приложения YouTube.</li>
            <li>Вставьте её в поле выше и нажмите «Найти». Можно ввести название — тогда мы покажем результаты поиска.</li>
            <li>Выберите формат: MP4 480p, 720p или только звук.</li>
            <li>Дождитесь подготовки файла — загрузка начнётся автоматически.</li>
          </ol>

          <h2>Что ещё можно скачать</h2>
          <ul>
            {LANDINGS.map((l) => (
              <li key={l.slug}>
                <Link href={`/${l.slug}`}>{l.h1}</Link>
              </li>
            ))}
          </ul>

          <AdSlot id="home-middle" />

          <h2>Частые вопросы</h2>
          {MAIN_FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      </div>
    </>
  );
}
