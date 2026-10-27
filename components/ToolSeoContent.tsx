import { TOOL_SEO, toolJsonLd } from "@/lib/seo-tools";

export function ToolSeoContent({ slug }: { slug: keyof typeof TOOL_SEO }) {
  const s = TOOL_SEO[slug];
  const ld = toolJsonLd(slug);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <section className="seo-content" style={{ marginTop: "2rem", maxWidth: "860px" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Giới thiệu</h2>
        <p style={{ opacity: 0.85, lineHeight: 1.65 }}>{s.intro}</p>

        <h2 style={{ fontSize: "1.25rem", marginTop: "1.5rem", marginBottom: "0.75rem" }}>Tính năng chính</h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: "1.25rem", opacity: 0.9 }}>
          {s.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>

        <h2 style={{ fontSize: "1.25rem", marginTop: "1.5rem", marginBottom: "0.75rem" }}>Câu hỏi thường gặp</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {s.faqs.map((f) => (
            <details key={f.q} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem 1rem" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>{f.q}</summary>
              <p style={{ marginTop: "0.5rem", opacity: 0.85, lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
