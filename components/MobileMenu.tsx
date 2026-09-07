"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { CATEGORY_ORDER, TOOLS, type ToolCategory } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";

const catKey = (c: ToolCategory) => c;

export default function MobileMenu() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="mm-trigger"
        onClick={() => setOpen(true)}
        aria-label="Menu"
      >
        <IconMenu2 size={18} stroke={2} />
      </button>

      {open && mounted && createPortal(
        <div
          className="mm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="mm-panel">
            <div className="mm-head">
              <b>Menu</b>
              <button
                type="button"
                className="mm-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="mm-body">
              {CATEGORY_ORDER.map((cat) => {
                const items = TOOLS.filter((tt) => tt.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat} className={`mm-group mm-group-${cat}`}>
                    <div className="mm-group-head">
                      <span>{t(catKey(cat))}</span>
                      <span className="mm-group-count">{items.length}</span>
                    </div>
                    <div className="mm-list">
                      {items.map((tool) => {
                        const active = pathname === tool.href;
                        return (
                          <Link
                            key={tool.href}
                            href={tool.href}
                            className={`mm-item mm-item-${cat}${active ? " active" : ""}`}
                          >
                            <div className="mm-item-icon">
                              <tool.Icon size={18} stroke={1.7} />
                            </div>
                            <div className="mm-item-body">
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
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
