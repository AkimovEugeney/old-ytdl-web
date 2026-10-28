import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppPromo } from "@/components/AppPromo";
import { AdSlot } from "@/components/AdSlot";
import { Downloader } from "@/components/Downloader";
import { getLanding, LANDINGS } from "@/lib/landings";
import { breadcrumbLd, faqLd, JsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return LANDINGS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = getLanding((await params).slug);
  if (!l) return {};
  return {
    title: { absolute: l.title },
    description: l.description,
    keywords: l.keywords,
    alternates: { canonical: `/${l.slug}` },
    openGraph: { title: l.title, description: l.description, url: `/${l.slug}`, type: "website", locale: "ru_RU" },
  };
}

export default async function LandingPage({ params }: Props) {
  const l = getLanding((await params).slug);
  if (!l) notFound();

  return (
    <div className="container">
      <JsonLd data={faqLd(l.faq)} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Главная", path: "/" },
          { name: l.h1, path: `/${l.slug}` },
        ])}
      />

      <section className="hero">
        <h1>{l.h1}</h1>
        <p className="sub">{l.lead}</p>
      </section>

      <Downloader />
      <AppPromo place="landing" />
      <AdSlot id={`landing-${l.slug}`} />

      <article className="prose">
        {l.sections.map((s) => (
          <section key={s.h2}>
            <h2>{s.h2}</h2>
            {s.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {s.list && (
              <ol>
                {s.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ol>
            )}
          </section>
        ))}

        <h2>Вопросы и ответы</h2>
        {l.faq.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}

        <h2>Другие страницы</h2>
        <ul>
          {LANDINGS.filter((x) => x.slug !== l.slug).map((x) => (
            <li key={x.slug}>
              <Link href={`/${x.slug}`}>{x.h1}</Link>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
