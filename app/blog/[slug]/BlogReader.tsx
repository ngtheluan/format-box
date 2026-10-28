"use client";

import { useEffect, useState } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowUpRight,
  IconBookmark,
  IconBookmarkFilled,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandThreads,
  IconAlertTriangle,
  IconCheck,
  IconDots,
  IconFlag,
  IconLetterA,
  IconLink,
  IconPencil,
  IconPrinter,
  IconThumbDown,
  IconThumbUp,
  IconUnlink,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { BlogVotes, ReactionKind, TocItem } from "@/lib/blog";
import type { Tool } from "@/lib/tools-shared";
import { ToolIcon } from "@/lib/tool-icons";
import { Button, Input, Modal, Textarea } from "@/components/ui";

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
export function BlogToc({ toc, title }: { toc: TocItem[]; title?: string }) {
  const { t } = useI18n();
  const [active, setActive] = useState(toc[0]?.id);

  useEffect(() => {
    const heads = toc.map((x) => document.getElementById(x.id)).filter(Boolean) as HTMLElement[];
    if (!heads.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" },
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [toc]);

  const idx = Math.max(
    0,
    toc.findIndex((x) => x.id === active),
  );

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

  // Arrow Up/Down jumps to prev/next heading. Skip when typing in an input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next = Math.max(0, Math.min(toc.length - 1, idx + dir));
      if (next === idx) return;
      e.preventDefault();
      const el = document.getElementById(toc[next].id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActive(toc[next].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toc, idx]);

  return (
    <nav className="bd-toc" aria-label={t("blog_toc")}>
      <div className="bd-toc-top">
        <span className="bd-toc-kicker">Context</span>
        <span className="bd-toc-pct">{pct}%</span>
      </div>
      {title && <h3 className="bd-toc-title">{title}</h3>}
      <span className="bd-toc-label">{t("blog_toc")}</span>
      <ol>
        {toc.map((x, i) => (
          <li key={x.id} className={x.id === active ? "is-active" : i < idx ? "is-read" : ""}>
            <a href={`#${x.id}`} onClick={() => setActive(x.id)}>
              <span>{x.text}</span>
            </a>
          </li>
        ))}
      </ol>
      <div className="bd-toc-dots" aria-hidden="true">
        {toc.map((x, i) => (
          <span key={x.id} className={i <= idx ? "is-on" : ""} />
        ))}
      </div>
      <div className="bd-toc-keys" aria-hidden="true">
        <kbd>
          <IconArrowUp size={11} stroke={2.2} />
        </kbd>
        <i>/</i>
        <kbd>
          <IconArrowDown size={11} stroke={2.2} />
        </kbd>
        <span>to jump</span>
      </div>
    </nav>
  );
}

export function ShareBar({ title, path }: { title: string; path: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [igOk, setIgOk] = useState(false);
  const url = () => (typeof window !== "undefined" ? window.location.origin + path : path);

  function open(href: string) {
    window.open(href, "_blank", "noopener,noreferrer,width=640,height=560");
  }

  async function copyLink(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url());
      return true;
    } catch {
      return false;
    }
  }

  async function copy() {
    if (await copyLink()) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  // Instagram has no web share intent, so copy the link for the user to paste
  // (into a story, bio or DM) and open Instagram in a new tab.
  async function shareInstagram() {
    await copyLink();
    setIgOk(true);
    setTimeout(() => setIgOk(false), 1600);
    open("https://www.instagram.com/");
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
        onClick={shareInstagram}
        title={igOk ? t("blog_share_ig_copied") : "Instagram"}
        aria-label="Instagram"
        className={igOk ? "is-ok" : ""}
      >
        {igOk ? <IconCheck size={16} stroke={2} /> : <IconBrandInstagram size={16} stroke={1.8} />}
      </button>
      <button
        type="button"
        onClick={() =>
          open(`https://www.threads.net/intent/post?text=${encodeURIComponent(`${title} ${url()}`)}`)
        }
        title="Threads"
        aria-label="Threads"
      >
        <IconBrandThreads size={16} stroke={1.8} />
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

// "Báo lỗi bài viết" — a reader flags wrong info, a typo or a broken link. Reuses
// the site's /api/feedback endpoint (kind "bug"), tagged with the article.
const REPORT_TYPES: {
  key: string;
  labelKey: Parameters<ReturnType<typeof useI18n>["t"]>[0];
  Icon: Icon;
}[] = [
  { key: "wrong", labelKey: "blog_report_type_wrong", Icon: IconAlertTriangle },
  { key: "content", labelKey: "blog_report_type_spelling", Icon: IconPencil },
  { key: "load", labelKey: "blog_report_type_broken", Icon: IconUnlink },
  { key: "other", labelKey: "blog_report_type_other", Icon: IconDots },
];

export function ReportError({ slug, title }: { slug: string; title: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [err, setErr] = useState("");

  function reset() {
    setPicked(new Set());
    setNote("");
    setContact("");
    setStatus("idle");
    setErr("");
  }

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setErr("");
  }

  async function submit() {
    if (picked.size === 0) {
      setErr(t("blog_report_need_type"));
      return;
    }
    setStatus("sending");
    try {
      const fd = new FormData();
      fd.set("kind", "bug");
      fd.set("errorTypes", Array.from(picked).join(","));
      const base = `Bài viết: "${title}" (/blog/${slug})`;
      fd.set("content", note.trim() ? `${base}\n${note.trim()}` : base);
      fd.set("pageUrl", typeof window !== "undefined" ? window.location.href : `/blog/${slug}`);
      if (contact.trim()) {
        fd.set("contact", contact.trim());
        fd.set("allowContact", "1");
      }
      const r = await fetch("/api/feedback", { method: "POST", body: fd });
      if (!r.ok) throw new Error(String(r.status));
      setStatus("ok");
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 1600);
    } catch {
      setStatus("error");
      setErr(t("blog_report_failed"));
    }
  }

  return (
    <>
      <button
        type="button"
        className="bd-tools-btn"
        onClick={() => setOpen(true)}
        aria-label={t("blog_report")}
        title={t("blog_report")}
      >
        <IconFlag size={14} stroke={1.8} />
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title={t("blog_report")}
        description={t("blog_report_desc")}
        size="md"
      >
        {status === "ok" ? (
          <div className="bd-report-ok">
            <span className="bd-report-ok-ic" aria-hidden="true">
              <IconCheck size={26} stroke={2.4} />
            </span>
            <p>{t("blog_report_thanks")}</p>
          </div>
        ) : (
          <div className="bd-report">
            <div className="bd-report-types" role="group" aria-label={t("blog_report")}>
              {REPORT_TYPES.map((rt) => {
                const on = picked.has(rt.key);
                return (
                  <button
                    key={rt.key}
                    type="button"
                    className={`bd-report-type${on ? " is-on" : ""}`}
                    onClick={() => toggle(rt.key)}
                    aria-pressed={on}
                  >
                    <span className="bd-report-type-ic" aria-hidden="true">
                      <rt.Icon size={17} stroke={1.8} />
                    </span>
                    <span className="bd-report-type-label">{t(rt.labelKey)}</span>
                    <span className="bd-report-type-check" aria-hidden="true">
                      <IconCheck size={13} stroke={2.6} />
                    </span>
                  </button>
                );
              })}
            </div>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("blog_report_note_ph")}
            />
            <Input
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t("blog_report_contact_ph")}
            />
            {err && (
              <p className="bd-report-err">
                <IconAlertTriangle size={14} stroke={2} /> {err}
              </p>
            )}
            <Button
              variant="primary"
              block
              loading={status === "sending"}
              onClick={submit}
              leftIcon={<IconFlag size={15} stroke={1.9} />}
            >
              {status === "sending" ? t("blog_report_sending") : t("blog_report_submit")}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}

// Font size A- / A+, bookmark, print — right-side tools of bd-topmeta.
const FONT_STEPS = [0.92, 1, 1.08, 1.18];
export function ReaderTools({ slug, title, markdown }: { slug: string; title: string; markdown: string }) {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = Number(localStorage.getItem("fb-blog-fs") || "1");
      if (Number.isFinite(s) && s >= 0 && s < FONT_STEPS.length) setStep(s);
    } catch {}
    try {
      const raw = localStorage.getItem("fb-blog-saved");
      const list: string[] = raw ? JSON.parse(raw) : [];
      setSaved(list.includes(slug));
    } catch {}
  }, [slug]);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".bd-article .blog-body");
    if (el) el.style.fontSize = `${FONT_STEPS[step]}rem`;
    try {
      localStorage.setItem("fb-blog-fs", String(step));
    } catch {}
  }, [step]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  function changeFont(delta: number) {
    setStep((s) => {
      const next = Math.max(0, Math.min(FONT_STEPS.length - 1, s + delta));
      if (next !== s) flash(`Cỡ chữ ${Math.round(FONT_STEPS[next] * 100)}%`);
      return next;
    });
  }

  function toggleSave() {
    try {
      const raw = localStorage.getItem("fb-blog-saved");
      const list: string[] = raw ? JSON.parse(raw) : [];
      const on = !list.includes(slug);
      const next = on ? [...list, slug] : list.filter((s) => s !== slug);
      localStorage.setItem("fb-blog-saved", JSON.stringify(next));
      setSaved(on);
      flash(on ? "Đã lưu bài" : "Đã bỏ lưu");
    } catch {}
  }

  function printMarkdown() {
    const safe = (s: string) => s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
    const bodyHtml = document.querySelector(".bd-article .blog-body")?.innerHTML || "";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${safe(title)}</title>
<style>
  :root { color-scheme: light; }
  body { font: 15px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color: #15181f; background: #fff; padding: 32px 40px; max-width: 760px; margin: 0 auto; }
  h1.doc-title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 20px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
  h2 { font-size: 18px; font-weight: 700; margin: 24px 0 10px; letter-spacing: -0.015em; }
  h3 { font-size: 15px; font-weight: 700; margin: 18px 0 8px; }
  p { margin: 0 0 12px; }
  ul, ol { margin: 0 0 14px; padding-left: 22px; }
  li { margin-bottom: 6px; }
  blockquote { margin: 16px 0; padding: 10px 16px; border-left: 3px solid #0ea5a4; background: #f3faf9; color: #15181f; font-style: italic; border-radius: 2px; }
  code { font: 0.86em/1 ui-monospace, SFMono-Regular, Menlo, monospace; background: #f3f4f6; padding: 1px 5px; border-radius: 3px; }
  pre { background: #0b0e1c; color: #d8def5; padding: 14px 16px; border-radius: 6px; overflow: auto; font-size: 12px; line-height: 1.6; }
  pre code { background: transparent; color: inherit; padding: 0; }
  a { color: #0ea5a4; text-decoration: underline; }
  img { max-width: 100%; height: auto; border-radius: 6px; margin: 12px 0; display: block; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 14px; font-size: 13px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
  th { background: #f9fafb; font-weight: 700; }
  hr { border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  h2, h3, img, pre, blockquote, table { page-break-inside: avoid; }
  @page { size: A4; margin: 20mm 18mm 22mm 18mm; }
  @media print {
    body { padding: 4mm 6mm; max-width: none; }
    h1.doc-title { margin-bottom: 14mm; }
    a { color: inherit; text-decoration: none; }
    img { max-height: 150mm; object-fit: contain; }
  }
</style></head><body><h1 class="doc-title">${safe(title)}</h1>${bodyHtml}</body></html>`;
    const prev = document.getElementById("bd-print-frame");
    if (prev) prev.remove();
    const iframe = document.createElement("iframe");
    iframe.id = "bd-print-frame";
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    iframe.srcdoc = html;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {}
      window.setTimeout(() => iframe.remove(), 2000);
    };
    flash("Đang chuẩn bị in…");
  }

  return (
    <div className="bd-tools" role="toolbar" aria-label="Công cụ đọc">
      <div className="bd-tools-group" aria-label="Cỡ chữ">
        <button
          type="button"
          onClick={() => changeFont(-1)}
          disabled={step === 0}
          aria-label="Giảm cỡ chữ"
          title="Giảm cỡ chữ"
        >
          A−
        </button>
        <button
          type="button"
          onClick={() => changeFont(1)}
          disabled={step === FONT_STEPS.length - 1}
          aria-label="Tăng cỡ chữ"
          title="Tăng cỡ chữ"
        >
          A+
        </button>
      </div>
      <button
        type="button"
        className={`bd-tools-btn${saved ? " is-on" : ""}`}
        onClick={toggleSave}
        aria-pressed={saved}
        aria-label={saved ? "Bỏ lưu" : "Lưu bài"}
        title={saved ? "Đã lưu — bấm để bỏ" : "Lưu bài để đọc sau"}
      >
        {saved ? <IconBookmarkFilled size={14} /> : <IconBookmark size={14} stroke={1.8} />}
      </button>
      <button
        type="button"
        className="bd-tools-btn"
        onClick={printMarkdown}
        aria-label="In bài viết"
        title={`In Markdown: ${title}`}
      >
        <IconPrinter size={14} stroke={1.8} />
      </button>
      <ReportError slug={slug} title={title} />
      {toast && (
        <span className="bd-tools-toast" role="status">
          {toast}
        </span>
      )}
    </div>
  );
}

// "Bài viết có hữu ích không" — one vote per reader (deduped server-side by user
// id / IP). Picking the other choice switches it; clicking the active one again
// clears it. The server is authoritative; the click is applied optimistically.
export function ArticleReaction({ slug, initial }: { slug: string; initial?: BlogVotes }) {
  const { t } = useI18n();
  const [v, setV] = useState<BlogVotes>(initial ?? { helpful: 0, unhelpful: 0, mine: null });

  useEffect(() => {
    // Reconcile with the server: ISR may have cached stale counts, and the
    // reader's own previous choice isn't known until this runs.
    fetch(`/api/blog/react?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.helpful === "number") setV({ helpful: d.helpful, unhelpful: d.unhelpful, mine: d.mine ?? null });
      })
      .catch(() => {});
  }, [slug]);

  async function vote(kind: ReactionKind) {
    setV((prev) => {
      const next = { ...prev };
      if (prev.mine === kind) {
        next[kind] = Math.max(0, prev[kind] - 1);
        next.mine = null;
      } else {
        if (prev.mine) next[prev.mine] = Math.max(0, prev[prev.mine] - 1);
        next[kind] = prev[kind] + 1;
        next.mine = kind;
      }
      return next;
    });
    try {
      const r = await fetch("/api/blog/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, kind }),
      });
      const d = await r.json();
      if (typeof d?.helpful === "number") setV({ helpful: d.helpful, unhelpful: d.unhelpful, mine: d.mine ?? null });
    } catch {}
  }

  return (
    <div className="bd-react" aria-label={t("blog_helpful_q")}>
      <span className="bd-react-q">{v.mine ? t("blog_helpful_thanks") : t("blog_helpful_q")}</span>
      <div className="bd-react-btns">
        <button
          type="button"
          className={`bd-react-btn${v.mine === "helpful" ? " is-on" : ""}`}
          onClick={() => vote("helpful")}
          aria-pressed={v.mine === "helpful"}
          title={t("blog_helpful_yes")}
        >
          <IconThumbUp size={15} stroke={1.9} />
          <span>{t("blog_helpful_yes")}</span>
          {v.helpful > 0 && <i className="bd-react-n">{v.helpful}</i>}
        </button>
        <button
          type="button"
          className={`bd-react-btn${v.mine === "unhelpful" ? " is-on" : ""}`}
          onClick={() => vote("unhelpful")}
          aria-pressed={v.mine === "unhelpful"}
          title={t("blog_helpful_no")}
        >
          <IconThumbDown size={15} stroke={1.9} />
          <span>{t("blog_helpful_no")}</span>
          {v.unhelpful > 0 && <i className="bd-react-n">{v.unhelpful}</i>}
        </button>
      </div>
    </div>
  );
}

// In-article "Công cụ liên quan" — surfaces FormatBox tools that fit the post,
// the one thing a standalone blog can't offer. Client-side for lang-aware copy.
export function RelatedTools({ tools }: { tools: Tool[] }) {
  const { t, lang } = useI18n();
  if (!tools.length) return null;
  return (
    <section className="bd-tools-rel" aria-label={t("blog_related_tools")}>
      <div className="bd-tools-rel-head">
        <span className="bd-tools-rel-eyebrow">{t("blog_related_tools")}</span>
        <span className="bd-tools-rel-sub">{t("blog_related_tools_sub")}</span>
      </div>
      <div className="bd-tools-rel-grid">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} prefetch={false} className="bd-tool-card">
            <span className="bd-tool-ic" aria-hidden="true">
              <ToolIcon name={tool.iconName} size={18} stroke={1.7} />
            </span>
            <span className="bd-tool-text">
              <strong>{tool.title}</strong>
              <span className="bd-tool-desc">{tool.desc[lang]}</span>
            </span>
            <IconArrowUpRight size={15} stroke={2} className="bd-tool-arrow" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// Adds copy buttons to code blocks and opens external links in a new tab.
export function BodyEnhancer({ slug }: { slug?: string }) {
  const { t } = useI18n();
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

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

    const coverFig = document.querySelector(".bd-article .bd-figure");
    const bodyImgs = Array.from(body.querySelectorAll<HTMLImageElement>("img"));
    const coverImgs = coverFig
      ? Array.from(coverFig.querySelectorAll<HTMLImageElement>("img"))
      : [];
    const imgs = [...coverImgs, ...bodyImgs];
    const onImgClick = (e: Event) => {
      const img = e.currentTarget as HTMLImageElement;
      setLightbox({ src: img.currentSrc || img.src, alt: img.alt || "" });
    };
    imgs.forEach((img) => {
      if (img.closest("a")) return;
      img.classList.add("bd-zoomable");
      img.addEventListener("click", onImgClick);
    });

    return () => {
      added.forEach((b) => b.remove());
      imgs.forEach((img) => {
        img.classList.remove("bd-zoomable");
        img.removeEventListener("click", onImgClick);
      });
    };
  }, [t, slug]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("fb-lightbox-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      document.body.classList.remove("fb-lightbox-open");
    };
  }, [lightbox]);

  if (!lightbox) return null;
  return (
    <div
      className="bd-lightbox"
      role="dialog"
      aria-modal="true"
      onClick={() => setLightbox(null)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        cursor: "zoom-out",
      }}
    >
      <button
        type="button"
        aria-label="Đóng"
        onClick={(e) => {
          e.stopPropagation();
          setLightbox(null);
        }}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "0",
          background: "rgba(255,255,255,0.14)",
          color: "#fff",
          fontSize: 22,
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lightbox.src}
        alt={lightbox.alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "95vw",
          maxHeight: "92vh",
          objectFit: "contain",
          borderRadius: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          cursor: "default",
        }}
      />
    </div>
  );
}
