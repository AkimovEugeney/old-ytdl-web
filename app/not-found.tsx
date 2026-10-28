import Link from "next/link";

export const metadata = { title: "Страница не найдена", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="container prose" style={{ paddingTop: 48, textAlign: "center" }}>
      <h1>Страница не найдена</h1>
      <p>Такой страницы нет. Вернитесь на главную и скачайте видео.</p>
      <Link href="/">На главную</Link>
    </div>
  );
}
