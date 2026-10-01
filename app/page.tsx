"use client";
import LiveDemo from "@/components/LiveDemo";
import { useTools } from "@/components/ToolsProvider";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { ToolIcon } from "@/lib/tool-icons";
import {
  IconArrowRight,
  IconCalculator,
  IconCheck,
  IconClock,
  IconFingerprint,
  IconHash,
  IconLink,
  IconPalette,
  IconRuler,
  IconTable,
} from "@tabler/icons-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, type CSSProperties, type MouseEvent } from "react";

// three.js stays out of the home page chunk; the hero paints first.
const HeroCanvas = dynamic(() => import("@/components/HeroCanvas"), { ssr: false });

const coming = [
  { Icon: IconLink, label: "URL Encode" },
  { Icon: IconHash, label: "HTML Entities" },
  { Icon: IconPalette, label: "Color Converter" },
  { Icon: IconFingerprint, label: "Hash (MD5 / SHA)" },
  { Icon: IconClock, label: "Unix Timestamp" },
  { Icon: IconRuler, label: "CSS Units" },
  { Icon: IconTable, label: "CSV ↔ JSON" },
  { Icon: IconCalculator, label: "Number Base" },
];

// Feeds the pointer position to CSS so cards can draw a spotlight under the cursor.
const spotlight = (e: MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

// Longest line of a heading, in em (~0.5em per character). CSS uses it to size the heading so it stays on one line.
const fit = (...lines: string[]) => ({ "--ch": Math.max(...lines.map((l) => l.length)) * 0.5 }) as CSSProperties;

// Bento layout: the first card is the feature tile, the sixth spans two columns.
const FEATURE = 0;
const WIDE = 5;

export default function Home() {
  const { t, lang } = useI18n();
  const tools = useTools();

  // Fade sections in as they scroll into view. Classes are added here, so content stays visible without JS.
  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    els.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const stats = [
    { k: "0", v: t("stat_ads") },
    { k: tools.length, v: t("stat_tools") },
    { k: "100%", v: t("stat_client") },
    { k: "∞", v: t("stat_uses") },
  ];
  const why = [
    { n: "01", h: t("why_01_h"), p: t("why_01_p") },
    { n: "02", h: t("why_02_h"), p: t("why_02_p") },
    { n: "03", h: t("why_03_h"), p: t("why_03_p") },
    { n: "04", h: t("why_04_h"), p: t("why_04_p") },
  ];

  return (
    <>
      <header className="hero-modern">
        <div className="hero-canvas-wrap">
          <HeroCanvas />
        </div>

        <div className="hero-inner hero-split">
          <div className="hero-copy">
            <div className="tag">
              <span className="i-check">
                <IconCheck size={12} stroke={3} />
              </span>
              {t("hero_tag")}
            </div>
            <h1 className="fit-h" style={fit(t("hero_h1_1"), t("hero_h1_2"))}>
              {t("hero_h1_1")}
              <br />
              <span className="g">{t("hero_h1_2")}</span>
            </h1>
            <p className="hero-sub">{t("hero_sub")}</p>
            <div className="hero-actions">
              <Button href="#tools" size="lg" rightIcon={<IconArrowRight size={16} stroke={2} />}>
                {t("hero_explore")}
              </Button>
            </div>
          </div>

          <div className="hero-demo-wrap">
            <LiveDemo />
            {tools.slice(0, 3).map((tool, i) => (
              <span key={tool.href} className={`float-chip float-chip-${i + 1}`} aria-hidden="true">
                <ToolIcon name={tool.iconName} size={15} stroke={1.8} />
                {tool.title}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-stats">
          {stats.map((s) => (
            <div key={s.v} className="hstat">
              <b>{s.k}</b>
              <span>{s.v}</span>
            </div>
          ))}
        </div>
      </header>

      <section id="tools">
        <div className="mx">
          <div className="sh-wrap" data-reveal>
            <div className="stag">TOOLS</div>
            <h2 className="sh fit-h" style={fit(t("sec_tools_h"))}>
              {t("sec_tools_h")}
            </h2>
            <p className="sd">{t("sec_tools_d")}</p>
          </div>
          <div className="tools-grid bento">
            {tools.slice(0, 8).map((tool, i) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`tool-card-m${i === FEATURE ? " is-feature" : ""}${i === WIDE ? " is-wide" : ""}`}
                style={{ animationDelay: `${i * 80}ms` }}
                onMouseMove={spotlight}
              >
                {(i === FEATURE || i === WIDE) && (
                  <div className="tool-ghost" aria-hidden="true">
                    <ToolIcon name={tool.iconName} size={i === FEATURE ? 260 : 170} stroke={1} />
                  </div>
                )}
                <div className="tool-head">
                  <div className="tool-icon">
                    <ToolIcon name={tool.iconName} size={i === FEATURE ? 30 : 22} stroke={1.6} />
                  </div>
                  <span className="tool-arrow">→</span>
                </div>
                <h3>{tool.title}</h3>
                <div className="tool-sub">{tool.sub[lang]}</div>
                <p>{tool.desc[lang]}</p>
                <div className="bc-tags">
                  {tool.tags.map((tag) => (
                    <span key={tag} className="bc-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="why">
        <div className="mx why-split">
          <div className="sh-wrap is-left" data-reveal>
            <div className="stag">WHY</div>
            <h2 className="sh fit-h" style={fit(t("sec_why_h_1"), t("sec_why_h_2"))}>
              {t("sec_why_h_1")}
              <br />
              {t("sec_why_h_2")}
            </h2>
          </div>
          <div className="why-list">
            {why.map((w, i) => (
              <div key={w.n} className="why-row" data-reveal style={{ "--rd": `${i * 90}ms` } as CSSProperties}>
                <div className="why-n">{w.n}</div>
                <div>
                  <h3>{w.h}</h3>
                  <p>{w.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="coming">
        <div className="mx">
          <div className="sh-wrap" data-reveal>
            <div className="stag">ROADMAP</div>
            <h2 className="sh fit-h" style={fit(t("sec_coming_h"))}>
              {t("sec_coming_h")}
            </h2>
          </div>
        </div>
        <div className="marquee" data-reveal>
          {[0, 1].map((row) => {
            const items = row ? [...coming].reverse() : coming;
            return (
              <div key={row} className={`marquee-row${row ? " rev" : ""}`}>
                <div className="marquee-track">
                  {[...items, ...items].map((c, i) => (
                    <span key={`${c.label}-${i}`} className="cp" aria-hidden={i >= items.length || undefined}>
                      <c.Icon size={15} stroke={1.7} />
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mx">
          <div className="cta cta-split" data-reveal>
            <div className="cta-copy">
              <h2 className="fit-h" style={fit(t("cta_h"))}>
                {t("cta_h")}
              </h2>
              <p>{t("cta_p")}</p>
            </div>
            <Button href="#tools" size="lg" rightIcon={<IconArrowRight size={16} stroke={2} />}>
              {t("hero_explore")}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
