"use client";
import Footer from "@/components/Footer";
import HeroCanvas from "@/components/HeroCanvas";
import LiveDemo from "@/components/LiveDemo";
import Nav from "@/components/Nav";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { TOOLS, TOOLS as tools } from "@/lib/tools";
import {
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
import Link from "next/link";

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

export default function Home() {
  const { t, lang } = useI18n();
  const stats = [
    { k: "0", v: t("stat_ads") },
    { k: TOOLS.length, v: t("stat_tools") },
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
      <Nav />

      <header className="hero-modern">
        <div className="hero-canvas-wrap">
          <HeroCanvas />
        </div>

        <div className="hero-inner">
          <div className="hero-copy">
            <div className="tag">
              <span className="i-check">
                <IconCheck size={12} stroke={3} />
              </span>
              {t("hero_tag")}
            </div>
            <h1>
              {t("hero_h1_1")}
              <br />
              <span className="g">{t("hero_h1_2")}</span>
            </h1>
            <p className="hero-sub">{t("hero_sub")}</p>

            <div className="stat-strip">
              {stats.map((s) => (
                <div key={s.v} className="stat">
                  <b>{s.k}</b>
                  <span>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hero-demo-wrap">
          <LiveDemo />
        </div>
      </header>

      <section id="tools">
        <div className="mx">
          <div className="sh-wrap">
            <div className="stag">TOOLS</div>
            <h2 className="sh">{t("sec_tools_h")}</h2>
            <p className="sd">{t("sec_tools_d")}</p>
          </div>
          <div className="tools-grid">
            {tools.slice(0, 8).map((tool, i) => (
              <Link key={tool.href} href={tool.href} className="tool-card-m" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="tool-head">
                  <div className="tool-icon">
                    <tool.Icon size={22} stroke={1.6} />
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

      <section id="why" style={{ paddingTop: 0 }}>
        <div className="mx">
          <div className="sh-wrap">
            <div className="stag">WHY</div>
            <h2 className="sh">
              {t("sec_why_h_1")}
              <br />
              {t("sec_why_h_2")}
            </h2>
          </div>
          <div className="why">
            {why.map((w) => (
              <div key={w.n} className="wc">
                <div className="wc-n">{w.n}</div>
                <h3>{w.h}</h3>
                <p>{w.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="coming" style={{ paddingTop: 0 }}>
        <div className="mx">
          <div className="sh-wrap">
            <div className="stag">ROADMAP</div>
            <h2 className="sh">{t("sec_coming_h")}</h2>
          </div>
          <div className="coming">
            {coming.map((c) => (
              <span key={c.label} className="cp">
                <c.Icon size={15} stroke={1.7} />
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="mx">
          <div className="cta">
            <h2>{t("cta_h")}</h2>
            <p>{t("cta_p")}</p>
            <Button href="/base64" size="lg">
              {t("cta_btn")}
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
