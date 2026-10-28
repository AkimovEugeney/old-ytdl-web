import { LAST_UPDATED } from "@/lib/site";

export type LegalSection = { title: string; body: string };

export function LegalPage({ title, lead, sections }: { title: string; lead: string; sections: LegalSection[] }) {
  return (
    <div className="container prose" style={{ paddingTop: 32 }}>
      <h1>{title}</h1>
      <p className="lead">{lead}</p>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>Редакция от {LAST_UPDATED}</p>
      {sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <p>{s.body}</p>
        </section>
      ))}
    </div>
  );
}
