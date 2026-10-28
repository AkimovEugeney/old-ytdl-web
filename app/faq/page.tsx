import type { Metadata } from "next";
import { MAIN_FAQ } from "@/lib/faq";
import { faqLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Вопросы и ответы — как скачать видео с YouTube",
  description: "Ответы на частые вопросы: как скачать видео с YouTube, какие форматы и ограничения, легально ли это.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <div className="container prose" style={{ paddingTop: 32 }}>
      <JsonLd data={faqLd(MAIN_FAQ)} />
      <h1>Вопросы и ответы</h1>
      {MAIN_FAQ.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
