"use client";
import { useTools } from "@/components/ToolsProvider";
import { useBlogNav } from "@/lib/blog-client";
import { slugifyLabel } from "@/lib/blog";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { ToolIcon } from "@/lib/tool-icons";
import { CATEGORY_ORDER, type ToolCategory } from "@/lib/tools-shared";
import {
  IconBulb,
  IconCategory,
  IconChevronDown,
  IconListNumbers,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const CAT_SHORT_LABEL: Record<ToolCategory, Record<Lang, string>> = {
  cat_text: { vi: "Văn bản", en: "Text" },
  cat_media: { vi: "Hình ảnh", en: "Media" },
  cat_dev: { vi: "Công cụ", en: "Dev" },
  cat_life: { vi: "Tiện ích", en: "Utilities" },
};

type BlogMenuKey = "cats" | "series" | "dyk";

const BLOG_MENU_LABEL: Record<BlogMenuKey, Record<Lang, string>> = {
  cats: { vi: "Danh mục", en: "Categories" },
  series: { vi: "Series", en: "Series" },
  dyk: { vi: "Tri thức", en: "Did you know" },
};

const BlogMenuIcon = {
  cats: IconCategory,
  series: IconListNumbers,
  dyk: IconBulb,
};

export default function ToolsMenu() {
  const { lang } = useI18n();
  const pathname = usePathname();
  const isBlog = pathname === "/blog" || pathname?.startsWith("/blog/") || false;

  if (isBlog) return <BlogMenu lang={lang} pathname={pathname} />;
  return <ToolsNav lang={lang} pathname={pathname} />;
}

function ToolsNav({ lang, pathname }: { lang: Lang; pathname: string }) {
  const TOOLS = useTools();
  const router = useRouter();
  const [openCat, setOpenCat] = useState<ToolCategory | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const prefetched = useRef(new Set<string>());

  useEffect(() => setOpenCat(null), [pathname]);

  useEffect(() => {
    if (!openCat) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenCat(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenCat(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openCat]);

  const prefetchCat = (cat: ToolCategory) => {
    TOOLS.filter((tt) => tt.category === cat).forEach((tool) => {
      if (!prefetched.current.has(tool.href)) {
        prefetched.current.add(tool.href);
        router.prefetch(tool.href);
      }
    });
  };

  return (
    <div className="nav-cats" ref={wrapRef}>
      {CATEGORY_ORDER.map((cat) => {
        const items = TOOLS.filter((tt) => tt.category === cat);
        if (items.length === 0) return null;
        const isOpen = openCat === cat;
        const isActive = items.some((it) => it.href === pathname);
        return (
          <div key={cat} className={`nav-cat nav-cat-${cat}${isOpen ? " open" : ""}`}>
            <button
              type="button"
              className={`nav-cat-btn${isActive ? " active" : ""}`}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              onMouseEnter={() => prefetchCat(cat)}
              onFocus={() => prefetchCat(cat)}
              onClick={() => setOpenCat((cur) => (cur === cat ? null : cat))}
            >
              <span>{CAT_SHORT_LABEL[cat][lang]}</span>
              <IconChevronDown size={14} stroke={2} className="chev" />
            </button>

            {isOpen && (
              <div className="nav-cat-panel" role="menu">
                <div className="nav-cat-list">
                  {items.map((tool) => {
                    const active = pathname === tool.href;
                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className={`nav-cat-item${active ? " active" : ""}`}
                        role="menuitem"
                      >
                        <div className="nav-cat-item-icon">
                          <ToolIcon name={tool.iconName} size={18} stroke={1.7} />
                        </div>
                        <div className="nav-cat-item-text">
                          <b>{tool.title[lang]}</b>
                          <span>{tool.desc[lang]}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BlogMenu({ lang, pathname }: { lang: Lang; pathname: string }) {
  const nav = useBlogNav(true);
  const router = useRouter();
  const [openKey, setOpenKey] = useState<BlogMenuKey | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const prefetched = useRef(new Set<string>());

  useEffect(() => setOpenKey(null), [pathname]);

  useEffect(() => {
    if (!openKey) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenKey(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenKey(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openKey]);

  const sections = useMemo<Array<{ key: BlogMenuKey; count: number }>>(() => {
    return [
      { key: "cats", count: nav.categories.length },
      { key: "series", count: nav.series.length },
      { key: "dyk", count: nav.didYouKnow.length },
    ];
  }, [nav]);

  const prefetchSection = (key: BlogMenuKey) => {
    const hrefs: string[] = [];
    if (key === "cats") {
      for (const c of nav.categories) hrefs.push(`/blog/tags/${slugifyLabel(c.label)}`);
    } else if (key === "series") {
      hrefs.push("/blog/series");
      for (const s of nav.series) hrefs.push(`/blog/series/${encodeURIComponent(s.slug)}`);
    }
    for (const href of hrefs) {
      if (!prefetched.current.has(href)) {
        prefetched.current.add(href);
        router.prefetch(href);
      }
    }
  };

  return (
    <div className="nav-cats" ref={wrapRef}>
      {sections.map(({ key, count }) => {
        if (count === 0) return null;
        const isOpen = openKey === key;
        const Icon = BlogMenuIcon[key];
        return (
          <div key={key} className={`nav-cat nav-cat-blog-${key}${isOpen ? " open" : ""}`}>
            <button
              type="button"
              className="nav-cat-btn"
              aria-expanded={isOpen}
              aria-haspopup="menu"
              onMouseEnter={() => prefetchSection(key)}
              onFocus={() => prefetchSection(key)}
              onClick={() => setOpenKey((cur) => (cur === key ? null : key))}
            >
              <Icon size={14} stroke={2} />
              <span>{BLOG_MENU_LABEL[key][lang]}</span>
              <IconChevronDown size={14} stroke={2} className="chev" />
            </button>

            {isOpen && (
              <div className="nav-cat-panel" role="menu">
                <div className="nav-cat-list">
                  {key === "cats" &&
                    nav.categories.map((c) => {
                      const slug = slugifyLabel(c.label);
                      const href = `/blog/tags/${slug}`;
                      const active = pathname === href;
                      return (
                        <Link
                          key={c.slug}
                          href={href}
                          className={`nav-cat-item${active ? " active" : ""}`}
                          role="menuitem"
                        >
                          <div className="nav-cat-item-icon">
                            <IconCategory size={18} stroke={1.7} />
                          </div>
                          <div className="nav-cat-item-text">
                            <b>{c.label}</b>
                          </div>
                        </Link>
                      );
                    })}

                  {key === "series" &&
                    nav.series.map((s) => {
                      const href = `/blog/series/${encodeURIComponent(s.slug)}`;
                      const active = pathname === href;
                      return (
                        <Link
                          key={s.slug}
                          href={href}
                          className={`nav-cat-item${active ? " active" : ""}`}
                          role="menuitem"
                        >
                          <div className="nav-cat-item-icon">
                            <IconListNumbers size={18} stroke={1.7} />
                          </div>
                          <div className="nav-cat-item-text">
                            <b>{s.label}</b>
                            <span>
                              {s.count} {lang === "en" ? "parts" : "phần"}
                            </span>
                          </div>
                        </Link>
                      );
                    })}

                  {key === "dyk" &&
                    nav.didYouKnow.map((d) => {
                      const href = `/blog#dyk-${encodeURIComponent(d.slug)}`;
                      const title = lang === "en" ? d.title_en || d.title_vi : d.title_vi;
                      const tag = lang === "en" ? d.tag_en || d.tag_vi : d.tag_vi;
                      return (
                        <Link
                          key={d.slug}
                          href={href}
                          className="nav-cat-item"
                          role="menuitem"
                        >
                          <div className="nav-cat-item-icon">
                            <IconBulb size={18} stroke={1.7} />
                          </div>
                          <div className="nav-cat-item-text">
                            <b>{title}</b>
                            {tag && <span>{tag}</span>}
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
