"use client";
import { useTools } from "@/components/ToolsProvider";
import { useI18n } from "@/lib/i18n";
import { toolBySlug, toolJsonLd } from "@/lib/tools-shared";
import {
  IconCheck,
  IconChevronDown,
  IconHelpCircle,
  IconInfoCircle,
  IconSparkles,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

const MOBILE_BP = 720;

export function ToolSeoContent({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const tools = useTools();
  const href = `/${slug.replace(/^\//, "")}`;
  // Prefer the live DB tool (so admin edits apply); fall back to the seed data.
  const tool = tools.find((x) => x.href === href) ?? toolBySlug(slug);

  // Default to desktop (open) so SSR renders with content visible for SEO;
  // after mount, flip to the real viewport width. The `key` on the wrapper
  // forces each <details> to re-initialize when the breakpoint crosses, so
  // the user can still freely toggle sections manually afterwards.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!tool) return null;

  // Photobooth is a camera-first tool — hide SEO sections entirely on mobile
  // so the viewport stays focused on the preview + action bar.
  if (isMobile && slug === "photobooth") return null;

  const intro = tool.intro?.[lang] ?? "";
  const features = tool.features?.[lang] ?? [];
  const faqs = tool.faqs?.[lang] ?? [];
  const ld = toolJsonLd(slug);
  const openByDefault = !isMobile;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="seo-block" key={isMobile ? "m" : "d"}>
        {intro && (
          <details className="seo-section" open={openByDefault}>
            <summary className="seo-section-head">
              <h2>
                <IconInfoCircle size={14} stroke={2} />
                {t("seo_intro")}
              </h2>
              <IconChevronDown size={16} stroke={2} className="seo-section-chev" />
            </summary>
            <div className="seo-section-body">
              <p className="seo-intro">{intro}</p>
            </div>
          </details>
        )}

        {features.length > 0 && (
          <details className="seo-section" open={openByDefault}>
            <summary className="seo-section-head">
              <h2>
                <IconSparkles size={14} stroke={2} />
                {t("seo_features")}
              </h2>
              <IconChevronDown size={16} stroke={2} className="seo-section-chev" />
            </summary>
            <div className="seo-section-body">
              <ul className="seo-features">
                {features.map((f) => (
                  <li key={f}>
                    <IconCheck size={16} stroke={2.2} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}

        {faqs.length > 0 && (
          <details className="seo-section" open={openByDefault}>
            <summary className="seo-section-head">
              <h2>
                <IconHelpCircle size={14} stroke={2} />
                {t("seo_faqs")}
              </h2>
              <IconChevronDown size={16} stroke={2} className="seo-section-chev" />
            </summary>
            <div className="seo-section-body">
              <div className="seo-faqs">
                {faqs.map((f) => (
                  <details key={f.q} className="seo-faq">
                    <summary>{f.q}</summary>
                    <p className="seo-faq-body">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </details>
        )}
      </div>
    </>
  );
}
