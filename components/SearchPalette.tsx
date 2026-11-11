"use client";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  IconArticle,
  IconCornerDownLeft,
  IconSearch,
  IconX,
  IconArrowsMoveVertical,
} from "@tabler/icons-react";
import { CATEGORY_ORDER, isToolVisible, toolSearchable, type Role, type Tool, type ToolCategory } from "@/lib/tools-shared";
import { useTools } from "@/components/ToolsProvider";
import { ToolIcon } from "@/lib/tool-icons";
import { useBlogNav, type BlogNavPost } from "@/lib/blog-client";
import { useI18n } from "@/lib/i18n";

type I18nT = ReturnType<typeof useI18n>["t"];

const catKey = (c: ToolCategory) => c;

function score(tool: Tool, q: string): number {
  if (!q) return 1;
  const needle = q.toLowerCase();
  const hay = toolSearchable(tool);
  if (!hay.includes(needle)) return 0;
  let s = 1;
  const titles = [tool.title.vi.toLowerCase(), tool.title.en.toLowerCase()];
  if (titles.some((x) => x.startsWith(needle))) s += 8;
  else if (titles.some((x) => x.includes(needle))) s += 5;
  if (tool.tags.some((x) => x.toLowerCase() === needle)) s += 4;
  if (tool.desc.en.toLowerCase().includes(needle) || tool.desc.vi.toLowerCase().includes(needle))
    s += 2;
  return s;
}

function scorePost(post: BlogNavPost, q: string): number {
  if (!q) return 1;
  const needle = q.toLowerCase();
  const title = post.title.toLowerCase();
  const hay = [
    title,
    post.excerpt.toLowerCase(),
    post.categoryLabel.toLowerCase(),
    post.tags.join(" ").toLowerCase(),
    post.slug.toLowerCase(),
  ].join(" ");
  if (!hay.includes(needle)) return 0;
  let s = 1;
  if (title.startsWith(needle)) s += 8;
  else if (title.includes(needle)) s += 5;
  if (post.tags.some((x) => x.toLowerCase() === needle)) s += 4;
  if (post.excerpt.toLowerCase().includes(needle)) s += 2;
  return s;
}

export default function SearchPalette() {
  const { t, lang } = useI18n();
  const pathname = usePathname();
  const isBlog = pathname === "/blog" || pathname?.startsWith("/blog/") || false;
  const TOOLS = useTools();
  const nav = useBlogNav(isBlog);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<Role>("guest");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
    setMounted(true);
    fetch("/api/user/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setRole((d?.user?.role as Role) ?? "guest"))
      .catch(() => {});
  }, []);

  // Cmd/Ctrl+K to toggle + Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    const onOpen = () => setOpen(true);
    window.addEventListener("fb:open-search", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("fb:open-search", onOpen);
    };
  }, []);

  // Broadcast open/close so other UI (e.g. MobileTabBar) can react
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("fb:search-state", { detail: { open } }));
  }, [open]);

  // Reset + focus + lock scroll when opened
  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const toolResults = useMemo(() => {
    if (isBlog) return [];
    const query = q.trim();
    return TOOLS.filter((tool) => isToolVisible(tool, role))
      .map((tool) => ({ tool, s: score(tool, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.tool);
  }, [q, TOOLS, role, isBlog]);

  const postResults = useMemo(() => {
    if (!isBlog) return [];
    const query = q.trim();
    return nav.posts
      .map((post) => ({ post, s: scorePost(post, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.post);
  }, [q, nav.posts, isBlog]);

  const total = isBlog ? postResults.length : toolResults.length;

  useEffect(() => setActive(0), [q, isBlog]);

  // Warm the highlighted result so Enter / click lands instantly.
  useEffect(() => {
    if (!open) return;
    const href = isBlog ? postResults[active] && `/blog/${postResults[active].slug}` : toolResults[active]?.href;
    if (href) router.prefetch(href);
  }, [active, open, isBlog, postResults, toolResults, router]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const goHref = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const renderTool = (tool: Tool, i: number) => (
    <button
      key={tool.href}
      data-idx={i}
      type="button"
      className={`sp-item sp-item-${tool.category}${i === active ? " active" : ""}`}
      onMouseEnter={() => setActive(i)}
      onClick={() => goHref(tool.href)}
    >
      <div className="sp-item-icon">
        <ToolIcon name={tool.iconName} size={18} stroke={1.7} />
      </div>
      <div className="sp-item-body">
        <b>{tool.title[lang]}</b>
        <span>{tool.desc[lang]}</span>
      </div>
      <span className="sp-item-path">{tool.href}</span>
    </button>
  );

  const renderPost = (post: BlogNavPost, i: number) => {
    const href = `/blog/${post.slug}`;
    return (
      <button
        key={post.slug}
        data-idx={i}
        type="button"
        className={`sp-item sp-item-blog${i === active ? " active" : ""}`}
        onMouseEnter={() => setActive(i)}
        onClick={() => goHref(href)}
      >
        <div className="sp-item-icon">
          <IconArticle size={18} stroke={1.7} />
        </div>
        <div className="sp-item-body">
          <b>{post.title}</b>
          <span>{post.excerpt || post.categoryLabel}</span>
        </div>
        <span className="sp-item-path">{post.categoryLabel}</span>
      </button>
    );
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (total ? (i + 1) % total : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (total ? (i - 1 + total) % total : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isBlog) {
        const p = postResults[active];
        if (p) goHref(`/blog/${p.slug}`);
      } else {
        const t = toolResults[active];
        if (t) goHref(t.href);
      }
    }
  };

  const placeholder = isBlog
    ? lang === "en"
      ? "Search posts…"
      : "Tìm bài viết…"
    : t("nav_search_placeholder");

  return (
    <>
      <button
        type="button"
        className="sp-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={placeholder}
        title={placeholder}
      >
        <IconSearch size={15} stroke={1.9} />
        <span>{placeholder}</span>
        <kbd className="sp-kbd">{isMac ? "⌘" : "Ctrl"} K</kbd>
      </button>

      {open && mounted && createPortal(
        <div
          className="sp-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-input-row">
              <IconSearch size={18} stroke={1.9} />
              <input
                ref={inputRef}
                className="sp-input"
                type="text"
                placeholder={placeholder}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onInputKey}
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="button"
                className="sp-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <IconX size={15} stroke={2} />
              </button>
            </div>

            <div className="sp-list" ref={listRef}>
              {isBlog
                ? renderBlogList({ q, t, postResults, renderPost })
                : renderToolList({ q, t, toolResults, renderTool })}
            </div>

            <div className="sp-footer">
              <span className="sp-hint">
                <kbd>
                  <IconArrowsMoveVertical size={11} stroke={2} />
                </kbd>{" "}
                di chuyển
              </span>
              <span className="sp-hint">
                <kbd>
                  <IconCornerDownLeft size={11} stroke={2} />
                </kbd>{" "}
                chọn
              </span>
              <span className="sp-hint">
                <kbd>esc</kbd> đóng
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function renderToolList({
  q,
  t,
  toolResults,
  renderTool,
}: {
  q: string;
  t: I18nT;
  toolResults: Tool[];
  renderTool: (tool: Tool, i: number) => ReactElement;
}) {
  if (toolResults.length === 0) {
    return (
      <div className="sp-empty">
        {t("nav_no_result")} &quot;{q}&quot;
      </div>
    );
  }
  if (q) {
    return (
      <>
        <div className="sp-section">
          {toolResults.length} {t("nav_results")}
        </div>
        {toolResults.map((tool, i) => renderTool(tool, i))}
      </>
    );
  }
  return (
    <>
      {CATEGORY_ORDER.map((cat) => {
        const items = toolResults.filter((tt) => tt.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className={`sp-group sp-group-${cat}`}>
            <div className="sp-section sp-group-head">
              <span>{t(catKey(cat))}</span>
              <span className="sp-group-count">{items.length}</span>
            </div>
            {items.map((tool) => renderTool(tool, toolResults.indexOf(tool)))}
          </div>
        );
      })}
    </>
  );
}

function renderBlogList({
  q,
  t,
  postResults,
  renderPost,
}: {
  q: string;
  t: I18nT;
  postResults: BlogNavPost[];
  renderPost: (post: BlogNavPost, i: number) => ReactElement;
}) {
  if (postResults.length === 0) {
    return (
      <div className="sp-empty">
        {t("nav_no_result")} &quot;{q}&quot;
      </div>
    );
  }
  if (q) {
    return (
      <>
        <div className="sp-section">
          {postResults.length} {t("nav_results")}
        </div>
        {postResults.map((p, i) => renderPost(p, i))}
      </>
    );
  }
  // Grouped by category when no query
  const groups = new Map<string, BlogNavPost[]>();
  for (const p of postResults) {
    const key = p.categoryLabel || p.category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return (
    <>
      {Array.from(groups.entries()).map(([label, items]) => (
        <div key={label} className="sp-group">
          <div className="sp-section sp-group-head">
            <span>{label}</span>
            <span className="sp-group-count">{items.length}</span>
          </div>
          {items.map((p) => renderPost(p, postResults.indexOf(p)))}
        </div>
      ))}
    </>
  );
}
