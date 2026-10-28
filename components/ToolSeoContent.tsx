"use client";
import { useTools } from "@/components/ToolsProvider";
import { useI18n } from "@/lib/i18n";
import { toolBySlug, toolJsonLd } from "@/lib/tools-shared";
import { IconCheck, IconHelpCircle, IconInfoCircle, IconSparkles } from "@tabler/icons-react";

export function ToolSeoContent({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const tools = useTools();
  const href = `/${slug.replace(/^\//, "")}`;
  // Prefer the live DB tool (so admin edits apply); fall back to the seed data.
  const tool = tools.find((x) => x.href === href) ?? toolBySlug(slug);
  if (!tool) return null;

  const intro = tool.intro?.[lang] ?? "";
  const features = tool.features?.[lang] ?? [];
  const faqs = tool.faqs?.[lang] ?? [];
  const ld = toolJsonLd(slug);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="seo-block">
        {intro && (
          <section className="seo-section">
            <h2>
              <IconInfoCircle size={14} stroke={2} />
              {t("seo_intro")}
            </h2>
            <p className="seo-intro">{intro}</p>
          </section>
        )}

        {features.length > 0 && (
          <section className="seo-section">
            <h2>
              <IconSparkles size={14} stroke={2} />
              {t("seo_features")}
            </h2>
            <ul className="seo-features">
              {features.map((f) => (
                <li key={f}>
                  <IconCheck size={16} stroke={2.2} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {faqs.length > 0 && (
          <section className="seo-section">
            <h2>
              <IconHelpCircle size={14} stroke={2} />
              {t("seo_faqs")}
            </h2>
            <div className="seo-faqs">
              {faqs.map((f) => (
                <details key={f.q} className="seo-faq">
                  <summary>{f.q}</summary>
                  <p className="seo-faq-body">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
