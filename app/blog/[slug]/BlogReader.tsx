"use client";

import { useEffect, useState } from "react";
import { IconBrandFacebook, IconBrandX, IconCheck, IconLink, IconListDetails } from "@tabler/icons-react";
import { useI18n } from "@/lib/i18n";
import type { TocItem } from "@/lib/blog";

// Thin bar at the top of the viewport showing how far the article has been read.
export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = document.querySelector(".bd-article");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      setP(Math.max(0, Math.min(1, -r.top / (total || 1))));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <div className="bd-progress" style={{ transform: `scaleX(${p})` }} aria-hidden="true" />;
}

// Table of contents with scroll-spy highlighting of the current section.
export function BlogToc({ toc }: { toc: TocItem[] }) {
  const { t } = useI18n();
  const [active, setActive] = useState(toc[0]?.id);

  useEffect(() => {
    const heads = toc.map((x) => document.getElementById(x.id)).filter(Boolean) as HTMLElement[];
    if (!heads.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" },
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [toc]);

  const idx = Math.max(0, toc.findIndex((x) => x.id === active));

  const [pct, setPct] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.querySelector(".bd-article");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      setPct(Math.round(Math.max(0, Math.min(1, -r.top / (total || 1))) * 100));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <nav className="bd-toc" aria-label={t("blog_toc")}>
      <div className="bd-toc-head">
        <div
          className="bd-toc-ring"
          aria-hidden="true"
          style={{ ["--pct" as string]: `${pct}%` }}
        >
          <b>{pct}%</b>
        </div>
        <div>
          <span className="bd-toc-kicker">
            <IconListDetails size={11} stroke={2} /> {t("blog_toc")}
          </span>
          <strong>
            {idx + 1} / {toc.length}
          </strong>
        </div>
      </div>
      <ol>
        {toc.map((x, i) => (
          <li key={x.id}>
            <a
              href={`#${x.id}`}
              className={`${x.id === active ? "is-active" : ""}${i < idx ? " is-read" : ""}`}
              onClick={() => setActive(x.id)}
            >
              <i>{String(i + 1).padStart(2, "0")}</i>
              <span>{x.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ShareBar({ title, path }: { title: string; path: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = () => (typeof window !== "undefined" ? window.location.origin + path : path);

  function open(href: string) {
    window.open(href, "_blank", "noopener,noreferrer,width=640,height=560");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  return (
    <div className="bd-share" aria-label={t("blog_share")}>
      <span className="bd-share-label">{t("blog_share")}</span>
      <button
        type="button"
        onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`)}
        title="Facebook"
        aria-label="Facebook"
      >
        <IconBrandFacebook size={16} stroke={1.8} />
      </button>
      <button
        type="button"
        onClick={() =>
          open(`https://x.com/intent/post?url=${encodeURIComponent(url())}&text=${encodeURIComponent(title)}`)
        }
        title="X"
        aria-label="X"
      >
        <IconBrandX size={16} stroke={1.8} />
      </button>
      <button
        type="button"
        onClick={copy}
        title={copied ? t("blog_copied") : t("blog_copy_link")}
        aria-label={t("blog_copy_link")}
        className={copied ? "is-ok" : ""}
      >
        {copied ? <IconCheck size={16} stroke={2} /> : <IconLink size={16} stroke={1.8} />}
      </button>
    </div>
  );
}

// Adds copy buttons to code blocks and opens external links in a new tab.
export function BodyEnhancer({ slug }: { slug?: string }) {
  const { t } = useI18n();
  useEffect(() => {
    const body = document.querySelector(".bd-article .blog-body");
    if (!body) return;
    const added: HTMLElement[] = [];
    body.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".bd-copy")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bd-copy";
      btn.textContent = t("blog_copy_code");
      btn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(pre.querySelector("code")?.textContent || pre.textContent || "");
          btn.textContent = t("blog_copied");
          btn.classList.add("is-ok");
          setTimeout(() => {
            btn.textContent = t("blog_copy_code");
            btn.classList.remove("is-ok");
          }, 1500);
        } catch {}
      };
      pre.appendChild(btn);
      added.push(btn);
    });
    body.querySelectorAll<HTMLAnchorElement>("a[href^='http']").forEach((a) => {
      if (a.host !== window.location.host) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
    });
    return () => added.forEach((b) => b.remove());
  }, [t, slug]);
  return null;
}
