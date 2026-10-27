"use client";
import { useToast } from "@/components/Toast";
import type { BlogCategoryRow } from "@/lib/blog";
import {
  IconBold,
  IconClock,
  IconCode,
  IconDeviceFloppy,
  IconH2,
  IconH3,
  IconItalic,
  IconLink,
  IconList,
  IconListNumbers,
  IconPhotoPlus,
  IconQuote,
  IconTable,
  IconUpload,
  IconWriting,
  IconX,
} from "@tabler/icons-react";
import TurndownService from "turndown";
// @ts-expect-error — package ships JS without types; we only use the GFM table plugin.
import { tables as turndownTables } from "turndown-plugin-gfm";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  categories: BlogCategoryRow[];
  onClose: () => void;
  onSaved: (slug: string) => void;
};

function autoSlug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/blog/upload-image", { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok || !j.url) throw new Error(j.error || "Upload lỗi");
  return j.url as string;
}

export default function ManualComposer({ open, categories, onClose, onSaved }: Props) {
  const toast = useToast();
  const [cover, setCover] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState<string>(categories[0]?.slug || "");
  const [readMin, setReadMin] = useState<number>(5);
  const [tagsInput, setTagsInput] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageInserting, setImageInserting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const inlineFileRef = useRef<HTMLInputElement>(null);

  const turndown = useMemo(() => {
    const td = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
      emDelimiter: "*",
      strongDelimiter: "**",
    });
    td.keep(["figure", "figcaption"]);
    td.use(turndownTables);
    return td;
  }, []);

  // Reset form when (re)opened
  useEffect(() => {
    if (!open) return;
    if (editorRef.current) editorRef.current.innerHTML = "";
  }, [open]);

  if (!open) return null;

  function setTitleAuto(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(autoSlug(v));
  }

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }

  function wrapBlock(tag: "H2" | "H3" | "BLOCKQUOTE" | "PRE") {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
  }

  function insertHtmlAtCursor(html: string) {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      editorRef.current!.insertAdjacentHTML("beforeend", html);
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const frag = range.createContextualFragment(html);
    const last = frag.lastChild;
    range.insertNode(frag);
    if (last) {
      range.setStartAfter(last);
      range.setEndAfter(last);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  async function onCoverPick(file: File) {
    setCoverUploading(true);
    try {
      const url = await uploadImage(file);
      setCover(url);
      toast("Đã upload ảnh bìa");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload lỗi");
    } finally {
      setCoverUploading(false);
    }
  }

  async function onInlinePick(file: File) {
    setImageInserting(true);
    try {
      const url = await uploadImage(file);
      const alt = file.name.replace(/\.[^.]+$/, "");
      insertHtmlAtCursor(
        `<p><img src="${url}" alt="${alt.replace(/"/g, "&quot;")}" style="max-width:100%" /></p><p><br/></p>`,
      );
      toast("Đã chèn ảnh");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload lỗi");
    } finally {
      setImageInserting(false);
    }
  }

  async function onPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const it of Array.from(items)) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        e.preventDefault();
        const f = it.getAsFile();
        if (f) await onInlinePick(f);
        return;
      }
    }
  }

  function askLink() {
    const url = window.prompt("Dán URL:");
    if (!url) return;
    exec("createLink", url);
  }

  function insertTable() {
    const rowsStr = window.prompt("Số dòng (không tính header):", "2");
    if (!rowsStr) return;
    const colsStr = window.prompt("Số cột:", "3");
    if (!colsStr) return;
    const rows = Math.max(1, Math.min(20, parseInt(rowsStr, 10) || 2));
    const cols = Math.max(1, Math.min(10, parseInt(colsStr, 10) || 3));
    const headCells = Array.from({ length: cols }, (_, i) => `<th>Cột ${i + 1}</th>`).join("");
    const bodyRows = Array.from({ length: rows }, () =>
      `<tr>${Array.from({ length: cols }, () => `<td>&nbsp;</td>`).join("")}</tr>`,
    ).join("");
    insertHtmlAtCursor(
      `<table border="1" style="border-collapse:collapse;width:100%"><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table><p><br/></p>`,
    );
  }

  async function save() {
    if (!title.trim()) return toast("Thiếu tiêu đề");
    if (!category) return toast("Chọn danh mục");
    const html = editorRef.current?.innerHTML ?? "";
    const markdown = turndown.turndown(html).trim();
    if (!markdown) return toast("Thiếu nội dung");
    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const r = await fetch("/api/blog/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug || undefined,
          title: title.trim(),
          excerpt: excerpt.trim(),
          category,
          tags,
          readMin,
          coverImage: cover || undefined,
          markdown,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        toast(j.error || "Lưu lỗi");
        return;
      }
      toast("Đã tạo bài nháp");
      onSaved(j.slug);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fx-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="fx-modal"
        style={{ maxWidth: 1100, width: "95vw", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        <div className="fx-modal-head">
          <h2>
            <IconWriting size={16} stroke={2} /> Soạn bài thủ công
            <span className="fx-badge">DRAFT</span>
          </h2>
          <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={onClose}>
            <IconX size={16} stroke={2} />
          </button>
        </div>
        <div className="fx-modal-body" style={{ overflow: "auto" }}>
          <div className="fx-field">
            <label>Ảnh bìa</label>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 180,
                  height: 100,
                  borderRadius: 8,
                  border: "1px dashed var(--border)",
                  background: cover ? `url(${cover}) center/cover` : "linear-gradient(135deg,#6366f1,#a855f7)",
                  flexShrink: 0,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  type="button"
                  className="fx-btn"
                  onClick={() => coverFileRef.current?.click()}
                  disabled={coverUploading}
                >
                  <IconUpload size={14} stroke={1.9} /> {coverUploading ? "Đang upload…" : cover ? "Đổi ảnh" : "Chọn ảnh"}
                </button>
                {cover && (
                  <button type="button" className="fx-btn fx-btn-ghost" onClick={() => setCover("")}>
                    <IconX size={14} stroke={1.9} /> Bỏ ảnh
                  </button>
                )}
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onCoverPick(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>

          <div className="fx-field">
            <label>Tiêu đề *</label>
            <input value={title} onChange={(e) => setTitleAuto(e.target.value)} placeholder="Tiêu đề bài viết" />
          </div>

          <div className="fx-field">
            <label>Giới thiệu</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Mô tả ngắn hiển thị ngoài danh sách"
              rows={2}
            />
          </div>

          <div className="fx-grid2">
            <div className="fx-field">
              <label>Danh mục *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">— chọn —</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fx-field">
              <label>
                <IconClock size={12} stroke={1.9} style={{ verticalAlign: "-2px" }} /> Phút đọc
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={readMin}
                onChange={(e) => setReadMin(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
              />
            </div>
          </div>

          <div className="fx-grid2">
            <div className="fx-field">
              <label>Tags (phẩy phân cách)</label>
              <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="ai, nextjs, blog" />
            </div>
            <div className="fx-field">
              <label>Slug</label>
              <input
                value={slug}
                onChange={(e) => {
                  setSlug(autoSlug(e.target.value));
                  setSlugTouched(true);
                }}
                placeholder="tu-dong-tu-tieu-de"
              />
            </div>
          </div>

          <div className="fx-field">
            <label>Nội dung *</label>
            <div
              style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                padding: 6,
                border: "1px solid var(--border)",
                borderBottom: "none",
                borderRadius: "8px 8px 0 0",
                background: "var(--bg2)",
              }}
            >
              <ToolbarBtn title="Đậm" onClick={() => exec("bold")}>
                <IconBold size={14} stroke={2} />
              </ToolbarBtn>
              <ToolbarBtn title="Nghiêng" onClick={() => exec("italic")}>
                <IconItalic size={14} stroke={2} />
              </ToolbarBtn>
              <ToolbarBtn title="Tiêu đề 2" onClick={() => wrapBlock("H2")}>
                <IconH2 size={14} stroke={2} />
              </ToolbarBtn>
              <ToolbarBtn title="Tiêu đề 3" onClick={() => wrapBlock("H3")}>
                <IconH3 size={14} stroke={2} />
              </ToolbarBtn>
              <ToolbarBtn title="Danh sách" onClick={() => exec("insertUnorderedList")}>
                <IconList size={14} stroke={2} />
              </ToolbarBtn>
              <ToolbarBtn title="Danh sách số" onClick={() => exec("insertOrderedList")}>
                <IconListNumbers size={14} stroke={2} />
              </ToolbarBtn>
              <ToolbarBtn title="Trích dẫn" onClick={() => wrapBlock("BLOCKQUOTE")}>
                <IconQuote size={14} stroke={2} />
              </ToolbarBtn>
              <ToolbarBtn title="Code" onClick={() => wrapBlock("PRE")}>
                <IconCode size={14} stroke={2} />
              </ToolbarBtn>
              <ToolbarBtn title="Liên kết" onClick={askLink}>
                <IconLink size={14} stroke={2} />
              </ToolbarBtn>
              <ToolbarBtn title="Chèn bảng" onClick={insertTable}>
                <IconTable size={14} stroke={2} />
              </ToolbarBtn>
              <ToolbarBtn
                title="Chèn ảnh (upload)"
                onClick={() => inlineFileRef.current?.click()}
                disabled={imageInserting}
              >
                <IconPhotoPlus size={14} stroke={2} />
              </ToolbarBtn>
              <input
                ref={inlineFileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onInlinePick(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onPaste={onPaste}
              className="manual-editor"
              data-placeholder="Viết bài ở đây… dán ảnh trực tiếp hoặc dùng nút chèn ảnh."
              style={{
                padding: 14,
                minHeight: 320,
                maxHeight: "50vh",
                overflow: "auto",
                border: "1px solid var(--border)",
                borderRadius: "0 0 8px 8px",
                background: "var(--bg1, var(--bg))",
                fontSize: 14,
                lineHeight: 1.6,
                outline: "none",
              }}
            />
            <style jsx>{`
              .manual-editor:empty::before {
                content: attr(data-placeholder);
                color: var(--dim, #94a3b8);
                pointer-events: none;
              }
              .manual-editor :global(img) {
                max-width: 100%;
                border-radius: 6px;
                margin: 8px 0;
              }
              .manual-editor :global(blockquote) {
                border-left: 3px solid var(--accent, #6366f1);
                padding: 4px 10px;
                color: var(--dim);
                margin: 8px 0;
              }
              .manual-editor :global(pre) {
                background: var(--bg2);
                padding: 10px;
                border-radius: 6px;
                overflow: auto;
                font-family: var(--font-mono, ui-monospace, monospace);
                font-size: 13px;
              }
              .manual-editor :global(h2) {
                font-size: 1.3em;
                margin: 14px 0 6px;
              }
              .manual-editor :global(h3) {
                font-size: 1.1em;
                margin: 12px 0 4px;
              }
              .manual-editor :global(a) {
                color: var(--accent, #6366f1);
                text-decoration: underline;
              }
            `}</style>
          </div>
        </div>
        <div className="fx-modal-foot">
          <button className="fx-btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="fx-btn fx-btn-primary" onClick={save} disabled={saving}>
            <IconDeviceFloppy size={14} stroke={2} /> {saving ? "Đang lưu…" : "Lưu bản nháp"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="fx-btn fx-btn-ghost"
      style={{ padding: "4px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      {children}
    </button>
  );
}
