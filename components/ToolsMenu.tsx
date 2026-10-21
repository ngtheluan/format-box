"use client";
import { useTools } from "@/components/ToolsProvider";
import { useI18n } from "@/lib/i18n";
import { ToolIcon } from "@/lib/tool-icons";
import { CATEGORY_ORDER } from "@/lib/tools-shared";
import { IconChevronDown, IconNews, IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type MenuKey = "tools" | "blog";

export default function ToolsMenu() {
  const { t, lang } = useI18n();
  const TOOLS = useTools();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const prefetched = useRef(new Set<string>());

  useEffect(() => setOpenMenu(null), [pathname]);

  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const prefetchAllTools = () => {
    TOOLS.forEach((tool) => {
      if (!prefetched.current.has(tool.href)) {
        prefetched.current.add(tool.href);
        router.prefetch(tool.href);
      }
    });
  };

  const toolsOpen = openMenu === "tools";
  const toolsActive = TOOLS.some((it) => it.href === pathname);
  const blogActive = pathname === "/blog" || pathname.startsWith("/blog/");

  return (
    <div className="nav-cats" ref={wrapRef}>
      <div className={`nav-cat${toolsOpen ? " open" : ""}`}>
        <button
          type="button"
          className={`nav-cat-btn${toolsActive ? " active" : ""}`}
          aria-expanded={toolsOpen}
          aria-haspopup="menu"
          onMouseEnter={prefetchAllTools}
          onFocus={prefetchAllTools}
          onClick={() => setOpenMenu((cur) => (cur === "tools" ? null : "tools"))}
        >
          <IconSettings size={14} stroke={1.8} />
          <span>{t("nav_tools")}</span>
          <IconChevronDown size={12} stroke={2} className="chev" />
        </button>

        {toolsOpen &&
          (() => {
            const groups = CATEGORY_ORDER.map((cat) => ({
              cat,
              items: TOOLS.filter((tt) => tt.category === cat),
            })).filter((g) => g.items.length > 0);
            return (
              <div
                className="nav-cat-panel nav-cat-panel--groups"
                role="menu"
                style={{ ["--nav-cat-cols" as string]: groups.length } as React.CSSProperties}
              >
                {groups.map(({ cat, items }) => {
                  return (
                    <div key={cat} className={`nav-cat-group nav-cat-${cat}`}>
                      <div className="nav-cat-group-head">{t(cat)}</div>
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
                                <b>{tool.title}</b>
                                <span>{tool.sub[lang]}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
      </div>

      <div className="nav-cat">
        <Link
          href="/blog"
          className={`nav-cat-btn${blogActive ? " active" : ""}`}
          onMouseEnter={() => router.prefetch("/blog")}
        >
          <IconNews size={14} stroke={1.8} />
          <span>{t("nav_blog")}</span>
        </Link>
      </div>
    </div>
  );
}
