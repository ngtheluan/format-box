"use client";
import "@/app/blog/blog.css";
import { BlogCover } from "@/components/BlogCover";
import { useToast } from "@/components/Toast";
import type { BlogCategory, BlogCategoryRow, BlogPost, BlogStatus } from "@/lib/blog";
import {
  IconArticle,
  IconCalendar,
  IconCategory,
  IconCheck,
  IconCircleDashedCheck,
  IconClock,
  IconDeviceFloppy,
  IconEdit,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconLayoutGrid,
  IconLoader2,
  IconPlus,
  IconRotateClockwise,
  IconSparkles,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { marked } from "marked";
import Link from "next/link";
import { useMemo, useState } from "react";
import AdminBody from "../AdminBody";

marked.setOptions({ gfm: true, breaks: false });

type Props = { initialPosts: BlogPost[]; initialCategories: BlogCategoryRow[] };
type StatusFilter = "all" | BlogStatus;

const STATUS_LABEL: Record<BlogStatus, string> = {
  draft: "Nháp",
  rejected: "Từ chối",
  published: "Phát hành",
};

export default function BlogAdminTool({ initialPosts, initialCategories }: Props) {
  const toast = useToast();
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [cats, setCats] = useState<BlogCategoryRow[]>(initialCategories);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tab, setTab] = useState<"posts" | "categories">("posts");

  const CAT_LABEL = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of cats) m[c.slug] = c.label;
    return m;
  }, [cats]);
  const CAT_ORDER = useMemo(() => cats.map((c) => c.slug), [cats]);

  // Category CRUD state
  const [catEditing, setCatEditing] = useState<{
    original?: string;
    slug: string;
    label: string;
    sort: number;
    active: boolean;
    isNew: boolean;
  } | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [catErr, setCatErr] = useState("");

  // Generate modal
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genMode, setGenMode] = useState<"topic" | "random">("topic");
  const [genCategory, setGenCategory] = useState<BlogCategory>("tech");
  const [topic, setTopic] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genErr, setGenErr] = useState("");

  // Edit modal
  const [editing, setEditing] = useState<{
    slug: string;
    title: string;
    excerpt: string;
    category: BlogCategory;
    tags: string;
    readMin: number;
    markdown: string;
    status?: BlogStatus;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState("");

  // Preview drawer (for drafts/rejected)
  const [preview, setPreview] = useState<{ post: BlogPost; html: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const counts = useMemo(() => {
    const c = { all: posts.length, draft: 0, rejected: 0, published: 0 };
    for (const p of posts) c[(p.status || "published") as BlogStatus]++;
    return c;
  }, [posts]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter((p) => {
      const s = p.status || "published";
      if (statusFilter !== "all" && s !== statusFilter) return false;
      if (!needle) return true;
      return (
        p.title.toLowerCase().includes(needle) ||
        p.slug.toLowerCase().includes(needle) ||
        p.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [posts, q, statusFilter]);

  const statActiveStyle = { border: "1.5px solid #f97316", boxShadow: "0 0 0 2px rgba(249,115,22,0.15)" } as const;

  async function generate() {
    const t = topic.trim();
    if (genMode === "topic" && !t) return;
    setGenLoading(true);
    setGenErr("");
    try {
      const r = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: genMode,
          topic: genMode === "topic" ? t : undefined,
          category: genMode === "topic" ? genCategory : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setGenErr(j?.error || `Lỗi ${r.status}`);
        return;
      }
      setPosts((prev) => [{ ...j.post, status: "draft" }, ...prev.filter((p) => p.slug !== j.post.slug)]);
      setTopic("");
      setGenerateOpen(false);
      toast(`Đã sinh: ${j.post.title}`);
    } catch (e: any) {
      setGenErr(e?.message || "Lỗi");
    } finally {
      setGenLoading(false);
    }
  }

  async function approve(p: BlogPost) {
    const r = await fetch("/api/blog/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: p.slug }),
    });
    const j = await r.json();
    if (!r.ok) return toast(j?.error || "Duyệt thất bại");
    setPosts((prev) => prev.map((x) => (x.slug === p.slug ? { ...x, status: "published" } : x)));
    toast(`Đã duyệt: ${p.title}`);
  }

  async function unpublish(p: BlogPost) {
    const r = await fetch("/api/blog/unpublish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: p.slug }),
    });
    const j = await r.json();
    if (!r.ok) return toast(j?.error || "Chuyển về nháp thất bại");
    setPosts((prev) => prev.map((x) => (x.slug === p.slug ? { ...x, status: "draft" } : x)));
    toast(`Đã chuyển về nháp: ${p.title}`);
  }

  async function reject(p: BlogPost) {
    const r = await fetch("/api/blog/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: p.slug }),
    });
    const j = await r.json();
    if (!r.ok) return toast(j?.error || "Từ chối thất bại");
    setPosts((prev) => prev.map((x) => (x.slug === p.slug ? { ...x, status: "rejected" } : x)));
    toast(`Đã từ chối: ${p.title}`);
  }

  async function remove(p: BlogPost) {
    if (!confirm(`Xoá hẳn "${p.title}"? Không undo được.`)) return;
    const r = await fetch("/api/blog/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: p.slug }),
    });
    const j = await r.json();
    if (!r.ok) return toast(j?.error || "Xoá thất bại");
    setPosts((prev) => prev.filter((x) => x.slug !== p.slug));
    toast(`Đã xoá: ${p.title}`);
  }

  async function startEdit(p: BlogPost) {
    try {
      const r = await fetch(`/api/blog/update?slug=${encodeURIComponent(p.slug)}`);
      const j = await r.json();
      if (!r.ok) return toast(j?.error || "Lỗi");
      setEditing({
        slug: p.slug,
        title: j.post.title,
        excerpt: j.post.excerpt,
        category: j.post.category,
        tags: (j.post.tags || []).join(", "),
        readMin: j.post.readMin,
        markdown: j.markdown || "",
        status: j.post.status,
      });
      setEditErr("");
    } catch (e: any) {
      toast(e?.message || "Lỗi");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setEditErr("");
    try {
      const r = await fetch("/api/blog/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: editing.slug,
          title: editing.title,
          excerpt: editing.excerpt,
          category: editing.category,
          tags: editing.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          readMin: Number(editing.readMin) || 10,
          markdown: editing.markdown,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setEditErr(j?.error || `Lỗi ${r.status}`);
        return;
      }
      setPosts((prev) =>
        prev.map((x) =>
          x.slug === editing.slug
            ? {
                ...x,
                title: editing.title,
                excerpt: editing.excerpt,
                category: editing.category,
                tags: editing.tags
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                readMin: Number(editing.readMin) || 10,
              }
            : x,
        ),
      );
      toast(`Đã lưu: ${editing.title}`);
      setEditing(null);
    } catch (e: any) {
      setEditErr(e?.message || "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  async function openPreview(p: BlogPost) {
    setPreviewLoading(true);
    try {
      const r = await fetch(`/api/blog/update?slug=${encodeURIComponent(p.slug)}`);
      const j = await r.json();
      if (!r.ok) {
        toast(j?.error || "Lỗi");
        return;
      }
      const html = (await marked.parse(j.markdown || "")) as string;
      setPreview({ post: j.post, html });
    } catch (e: any) {
      toast(e?.message || "Lỗi");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin";
  }

  async function reloadCategories() {
    try {
      const r = await fetch("/api/blog/categories");
      const j = await r.json();
      if (r.ok && Array.isArray(j.categories)) setCats(j.categories);
    } catch {}
  }

  function openNewCategory() {
    setCatEditing({ slug: "", label: "", sort: (cats.at(-1)?.sort ?? 0) + 10, active: true, isNew: true });
    setCatErr("");
  }
  function openEditCategory(c: BlogCategoryRow) {
    setCatEditing({ original: c.slug, slug: c.slug, label: c.label, sort: c.sort, active: c.active, isNew: false });
    setCatErr("");
  }

  async function saveCategory() {
    if (!catEditing) return;
    const label = catEditing.label.trim();
    if (!label) {
      setCatErr("Thiếu tên danh mục");
      return;
    }
    setCatSaving(true);
    setCatErr("");
    try {
      if (catEditing.isNew) {
        const r = await fetch("/api/blog/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: catEditing.slug || label,
            label,
            sort: catEditing.sort,
            active: catEditing.active,
          }),
        });
        const j = await r.json();
        if (!r.ok) {
          setCatErr(j?.error || `Lỗi ${r.status}`);
          return;
        }
      } else {
        const r = await fetch("/api/blog/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: catEditing.original,
            label,
            sort: catEditing.sort,
            active: catEditing.active,
          }),
        });
        const j = await r.json();
        if (!r.ok) {
          setCatErr(j?.error || `Lỗi ${r.status}`);
          return;
        }
      }
      await reloadCategories();
      toast(`Đã lưu danh mục: ${label}`);
      setCatEditing(null);
    } catch (e: any) {
      setCatErr(e?.message || "Lỗi");
    } finally {
      setCatSaving(false);
    }
  }

  async function toggleCategoryActive(c: BlogCategoryRow) {
    const r = await fetch("/api/blog/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: c.slug, active: !c.active }),
    });
    const j = await r.json();
    if (!r.ok) return toast(j?.error || "Lỗi");
    setCats((prev) => prev.map((x) => (x.slug === c.slug ? { ...x, active: !c.active } : x)));
    toast(`${!c.active ? "Bật" : "Tắt"}: ${c.label}`);
  }

  async function removeCategory(c: BlogCategoryRow) {
    if (!confirm(`Xoá danh mục "${c.label}"?`)) return;
    const r = await fetch(`/api/blog/categories?slug=${encodeURIComponent(c.slug)}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) return toast(j?.error || "Xoá thất bại");
    setCats((prev) => prev.filter((x) => x.slug !== c.slug));
    toast(`Đã xoá: ${c.label}`);
  }

  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", icon: <IconLayoutGrid size={13} stroke={1.8} />, href: "/admin" },
        { label: "Blog", current: true, badge: <span className="fx-badge">{posts.length}</span> },
      ]}
      search={{ value: q, onChange: setQ, placeholder: "Tìm theo tiêu đề, slug, tag…" }}
      onLogout={logout}
      headerActions={
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: 3,
              background: "var(--bg2)",
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => setTab("posts")}
              className={`fx-btn ${tab === "posts" ? "fx-btn-primary" : "fx-btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              <IconArticle size={13} stroke={1.9} /> Bài viết
            </button>
            <button
              type="button"
              onClick={() => setTab("categories")}
              className={`fx-btn ${tab === "categories" ? "fx-btn-primary" : "fx-btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              <IconCategory size={13} stroke={1.9} /> Danh mục
            </button>
          </div>
          {tab === "posts" ? (
            <button onClick={() => setGenerateOpen(true)} className="fx-btn fx-btn-primary">
              <IconSparkles size={14} stroke={2.2} /> Sinh bài
            </button>
          ) : (
            <button onClick={openNewCategory} className="fx-btn fx-btn-primary">
              <IconPlus size={14} stroke={2.2} /> Thêm danh mục
            </button>
          )}
        </div>
      }
      stats={
        <>
          <div
            className="fx-stat"
            onClick={() => setStatusFilter("all")}
            style={{ cursor: "pointer", ...(statusFilter === "all" ? statActiveStyle : null) }}
          >
            <span className="fx-stat-ico">
              <IconArticle size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{counts.all}</span>
              <span className="fx-stat-lbl">Tổng bài</span>
            </span>
          </div>
          <div
            className="fx-stat"
            data-tone="info"
            onClick={() => setStatusFilter("draft")}
            style={{ cursor: "pointer", ...(statusFilter === "draft" ? statActiveStyle : null) }}
          >
            <span className="fx-stat-ico">
              <IconClock size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{counts.draft}</span>
              <span className="fx-stat-lbl">Nháp</span>
            </span>
          </div>
          <div
            className="fx-stat"
            data-tone="mute"
            onClick={() => setStatusFilter("rejected")}
            style={{ cursor: "pointer", ...(statusFilter === "rejected" ? statActiveStyle : null) }}
          >
            <span className="fx-stat-ico">
              <IconX size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{counts.rejected}</span>
              <span className="fx-stat-lbl">Từ chối</span>
            </span>
          </div>
          <div
            className="fx-stat"
            data-tone="ok"
            onClick={() => setStatusFilter("published")}
            style={{ cursor: "pointer", ...(statusFilter === "published" ? statActiveStyle : null) }}
          >
            <span className="fx-stat-ico">
              <IconCircleDashedCheck size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{counts.published}</span>
              <span className="fx-stat-lbl">Phát hành</span>
            </span>
          </div>
        </>
      }
    >
      {tab === "categories" ? (
        cats.length === 0 ? (
          <div className="fx-empty">
            <div className="fx-empty-ico">
              <IconCategory size={22} stroke={1.7} />
            </div>
            Chưa có danh mục. Bấm "Thêm danh mục" để tạo mới.
          </div>
        ) : (
          <div className="fx-table">
            <div className="fx-row fx-row-head" style={{ gridTemplateColumns: "32px 1fr 160px 80px 80px 140px" }}>
              <div />
              <div>Danh mục</div>
              <div>Slug</div>
              <div style={{ textAlign: "center" }}>Thứ tự</div>
              <div style={{ textAlign: "center" }}>Bài</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>
            {cats.map((c) => {
              const n = posts.filter((p) => p.category === c.slug).length;
              return (
                <div
                  key={c.slug}
                  className="fx-row"
                  style={{ gridTemplateColumns: "32px 1fr 160px 80px 80px 140px", opacity: c.active ? 1 : 0.55 }}
                >
                  <div className="fx-icon-cell">
                    <IconCategory size={18} stroke={1.7} />
                  </div>
                  <div className="fx-title-cell">
                    <div className="fx-t-row">
                      <b>{c.label}</b>
                      {!c.active && (
                        <span className="fx-badge" data-tone="mute">
                          Tắt
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)" }}>{c.slug}</div>
                  <div style={{ textAlign: "center", fontSize: 12, color: "var(--dim)" }}>{c.sort}</div>
                  <div style={{ textAlign: "center", fontSize: 12, color: "var(--dim)" }}>{n}</div>
                  <div className="fx-row-actions">
                    <button
                      className="fx-btn fx-btn-icon"
                      onClick={() => toggleCategoryActive(c)}
                      title={c.active ? "Tắt" : "Bật"}
                    >
                      {c.active ? <IconEye size={14} stroke={1.9} /> : <IconEyeOff size={14} stroke={1.9} />}
                    </button>
                    <button className="fx-btn fx-btn-icon" onClick={() => openEditCategory(c)} title="Sửa">
                      <IconEdit size={14} stroke={1.9} />
                    </button>
                    <button
                      className="fx-btn fx-btn-icon fx-btn-danger"
                      onClick={() => removeCategory(c)}
                      title="Xoá"
                      disabled={n > 0}
                    >
                      <IconTrash size={14} stroke={1.9} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : visible.length === 0 ? (
        <div className="fx-empty">
          <div className="fx-empty-ico">
            <IconArticle size={22} stroke={1.7} />
          </div>
          {posts.length === 0 ? 'Chưa có bài. Bấm "Sinh bài" để tạo bài AI đầu tiên.' : "Không có kết quả phù hợp."}
        </div>
      ) : (
        <div className="fx-table">
          <div className="fx-row fx-row-head" style={{ gridTemplateColumns: "32px 1fr 100px 110px 100px 160px" }}>
            <div />
            <div>Bài viết</div>
            <div>Category</div>
            <div>Status</div>
            <div>Ngày</div>
            <div style={{ textAlign: "right" }}>Actions</div>
          </div>
          {visible.map((p) => {
            const status = (p.status || "published") as BlogStatus;
            return (
              <div key={p.slug} className="fx-row" style={{ gridTemplateColumns: "32px 1fr 100px 110px 100px 160px" }}>
                <div className="fx-icon-cell">
                  <IconArticle size={18} stroke={1.7} />
                </div>
                <div className="fx-title-cell">
                  <div className="fx-t-row">
                    <b>{p.title}</b>
                    <span className="fx-t-href">/blog/{p.slug}</span>
                  </div>
                  <span className="fx-t-sub">{p.excerpt}</span>
                </div>
                <div>
                  <span className="fx-cat-cell" data-cat={p.category}>
                    {CAT_LABEL[p.category] || p.category}
                  </span>
                </div>
                <div>
                  <span
                    className="fx-badge"
                    data-tone={status === "published" ? "ok" : status === "rejected" ? "mute" : "info"}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-muted, #888)" }}>{p.date}</div>
                <div className="fx-row-actions">
                  {(status === "draft" || status === "rejected") && (
                    <button
                      className="fx-btn fx-btn-icon"
                      onClick={() => approve(p)}
                      title="Duyệt → DB"
                      style={{ color: "var(--ok, #10b981)" }}
                    >
                      <IconCheck size={14} stroke={2} />
                    </button>
                  )}
                  {status === "draft" && (
                    <button
                      className="fx-btn fx-btn-icon"
                      onClick={() => reject(p)}
                      title="Từ chối"
                      style={{ color: "var(--warn, #f59e0b)" }}
                    >
                      <IconX size={14} stroke={2} />
                    </button>
                  )}
                  {status === "published" ? (
                    <>
                      <Link href={`/blog/${p.slug}`} target="_blank" className="fx-btn fx-btn-icon" title="Xem">
                        <IconEye size={14} stroke={1.9} />
                      </Link>
                      <button
                        className="fx-btn fx-btn-icon"
                        onClick={() => unpublish(p)}
                        title="Về nháp để sửa"
                        style={{ color: "var(--info, #3b82f6)" }}
                      >
                        <IconRotateClockwise size={14} stroke={1.9} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="fx-btn fx-btn-icon"
                        onClick={() => openPreview(p)}
                        title="Xem thử (nháp)"
                        disabled={previewLoading}
                      >
                        {previewLoading ? (
                          <IconLoader2 size={14} className="spin" />
                        ) : (
                          <IconEye size={14} stroke={1.9} />
                        )}
                      </button>
                      <button className="fx-btn fx-btn-icon" onClick={() => startEdit(p)} title="Sửa">
                        <IconEdit size={14} stroke={1.9} />
                      </button>
                    </>
                  )}
                  <button className="fx-btn fx-btn-icon fx-btn-danger" onClick={() => remove(p)} title="Xoá">
                    <IconTrash size={14} stroke={1.9} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GENERATE MODAL */}
      {generateOpen && (
        <div className="fx-modal-bg" style={{ zIndex: 200 }}>
          <div className="fx-modal" style={{ maxWidth: 560 }}>
            <div className="fx-modal-head">
              <h2>
                <IconSparkles size={16} stroke={2} /> Sinh bài blog
                <span className="fx-badge">AI</span>
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => !genLoading && setGenerateOpen(false)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body">
              <div className="fx-field">
                <label>Chế độ</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                  {(
                    [
                      ["topic", "Tự nhập"],
                      ["random", "Ngẫu nhiên"],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      disabled={genLoading}
                      onClick={() => setGenMode(k)}
                      className={`fx-btn${genMode === k ? " fx-btn-primary" : ""}`}
                      style={{ justifyContent: "center" }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {genMode === "topic" && (
                <>
                  <div className="fx-field">
                    <label>Danh mục</label>
                    <select
                      value={genCategory}
                      disabled={genLoading}
                      onChange={(e) => setGenCategory(e.target.value as BlogCategory)}
                    >
                      {CAT_ORDER.map((c) => (
                        <option key={c} value={c}>
                          {CAT_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fx-field">
                    <label>Chủ đề *</label>
                    <input
                      autoFocus
                      value={topic}
                      disabled={genLoading}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && generate()}
                      placeholder="VD: WebGPU cho người mới 2026, Rust vs Go…"
                    />
                  </div>
                </>
              )}

              <p style={{ fontSize: 12, color: "var(--fg-muted, #888)", marginTop: 4 }}>
                {genMode === "topic"
                  ? "AI viết bài theo chủ đề và danh mục bạn chọn + 2-3 ảnh minh hoạ + có thể nhúng YouTube."
                  : "AI tự chọn ngẫu nhiên 1 chủ đề và danh mục rồi viết bài."}{" "}
                Bài vào trạng thái <b>Nháp</b>, bạn duyệt sau.
              </p>
              {genErr && <div className="fx-err">{genErr}</div>}
            </div>
            <div className="fx-modal-foot">
              <button className="fx-btn" onClick={() => setGenerateOpen(false)} disabled={genLoading}>
                Huỷ
              </button>
              <button
                className="fx-btn fx-btn-primary"
                onClick={generate}
                disabled={(genMode === "topic" && !topic.trim()) || genLoading}
              >
                {genLoading ? (
                  <>
                    <IconLoader2 size={14} className="spin" /> Đang sinh (~30-60s)
                  </>
                ) : (
                  <>
                    <IconSparkles size={14} /> Sinh bài
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editing && (
        <div className="fx-modal-bg" style={{ zIndex: 200 }}>
          <div className="fx-modal" style={{ maxWidth: 1100, width: "95vw", maxHeight: "92vh" }}>
            <div className="fx-modal-head">
              <h2>
                <IconEdit size={16} stroke={2} /> Sửa: {editing.title}
                <span className="fx-badge">{editing.status ? STATUS_LABEL[editing.status] : "EDIT"}</span>
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => !saving && setEditing(null)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body">
              <div className="fx-grid2">
                <div className="fx-field">
                  <label>Slug</label>
                  <input value={editing.slug} disabled />
                </div>
                <div className="fx-field">
                  <label>Category</label>
                  <select
                    value={editing.category}
                    onChange={(e) =>
                      setEditing((cur) => (cur ? { ...cur, category: e.target.value as BlogCategory } : cur))
                    }
                  >
                    {CAT_ORDER.map((c) => (
                      <option key={c} value={c}>
                        {CAT_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fx-field">
                <label>Title *</label>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing((cur) => (cur ? { ...cur, title: e.target.value } : cur))}
                />
              </div>
              <div className="fx-field">
                <label>Excerpt</label>
                <textarea
                  rows={2}
                  style={{ resize: "none" }}
                  value={editing.excerpt}
                  onChange={(e) => setEditing((cur) => (cur ? { ...cur, excerpt: e.target.value } : cur))}
                />
              </div>
              <div className="fx-grid2">
                <div className="fx-field">
                  <label>Tags (phẩy phân cách)</label>
                  <input
                    value={editing.tags}
                    onChange={(e) => setEditing((cur) => (cur ? { ...cur, tags: e.target.value } : cur))}
                  />
                </div>
                <div className="fx-field">
                  <label>Read min</label>
                  <input
                    type="number"
                    value={editing.readMin}
                    onChange={(e) => setEditing((cur) => (cur ? { ...cur, readMin: Number(e.target.value) } : cur))}
                  />
                </div>
              </div>
              <div className="fx-field">
                <label>Markdown</label>
                <textarea
                  value={editing.markdown}
                  onChange={(e) => setEditing((cur) => (cur ? { ...cur, markdown: e.target.value } : cur))}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    minHeight: "48vh",
                    maxHeight: "60vh",
                    resize: "vertical",
                    overflowY: "auto",
                    width: "100%",
                  }}
                />
              </div>
              {editErr && <div className="fx-err">{editErr}</div>}
            </div>
            <div className="fx-modal-foot">
              <Link href={`/blog/${editing.slug}`} target="_blank" className="fx-btn" style={{ marginRight: "auto" }}>
                <IconExternalLink size={14} /> Xem bài
              </Link>
              <button className="fx-btn" onClick={() => setEditing(null)} disabled={saving}>
                Huỷ
              </button>
              <button className="fx-btn fx-btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? (
                  <>
                    <IconLoader2 size={14} className="spin" /> Đang lưu…
                  </>
                ) : (
                  <>
                    <IconDeviceFloppy size={14} /> Lưu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW DRAWER (drafts/rejected) */}
      {preview && (
        <>
          <div
            onClick={() => setPreview(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              zIndex: 180,
              animation: "fade-in 0.2s ease",
            }}
          />
          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(560px, 100vw)",
              background: "var(--bg)",
              borderLeft: "1px solid var(--border)",
              zIndex: 190,
              display: "flex",
              flexDirection: "column",
              boxShadow: "-20px 0 60px -10px rgba(0,0,0,0.5)",
              animation: "drawer-in 0.25s ease",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "color-mix(in srgb, var(--bg) 92%, transparent)",
                backdropFilter: "blur(10px)",
              }}
            >
              <span className="fx-badge" data-tone={preview.post.status === "rejected" ? "mute" : "info"}>
                {preview.post.status === "rejected" ? "Từ chối" : "Nháp"}
              </span>
              <b style={{ flex: 1, fontSize: 14, color: "var(--bright)" }}>Xem thử</b>
              <button
                type="button"
                className="fx-btn fx-btn-icon fx-btn-ghost"
                onClick={() => setPreview(null)}
                title="Đóng"
              >
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 40px" }}>
              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  marginBottom: 16,
                  border: "1px solid var(--border)",
                  aspectRatio: "16 / 9",
                }}
              >
                <BlogCover post={preview.post} />
              </div>
              <h1 style={{ fontSize: "1.3rem", lineHeight: 1.3, color: "var(--bright)", marginBottom: 10 }}>
                {preview.post.title}
              </h1>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  fontSize: 12,
                  color: "var(--dim)",
                  paddingBottom: 14,
                  borderBottom: "1px dashed var(--border)",
                  marginBottom: 16,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconUser size={12} stroke={1.8} /> {preview.post.author}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconCalendar size={12} stroke={1.8} /> {preview.post.date}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconClock size={12} stroke={1.8} /> {preview.post.readMin} phút đọc
                </span>
              </div>
              <div className="blog-body" dangerouslySetInnerHTML={{ __html: preview.html }} />
            </div>
          </aside>
        </>
      )}

      {/* CATEGORY EDIT MODAL */}
      {catEditing && (
        <div className="fx-modal-bg" style={{ zIndex: 200 }}>
          <div className="fx-modal" style={{ maxWidth: 480 }}>
            <div className="fx-modal-head">
              <h2>
                <IconCategory size={16} stroke={2} /> {catEditing.isNew ? "Thêm danh mục" : "Sửa danh mục"}
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => !catSaving && setCatEditing(null)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body">
              <div className="fx-field">
                <label>Tên hiển thị *</label>
                <input
                  autoFocus
                  value={catEditing.label}
                  disabled={catSaving}
                  onChange={(e) => setCatEditing((cur) => (cur ? { ...cur, label: e.target.value } : cur))}
                  placeholder="VD: Món ăn Việt"
                />
              </div>
              <div className="fx-grid2">
                <div className="fx-field">
                  <label>Slug {catEditing.isNew ? "" : "(cố định)"}</label>
                  <input
                    value={catEditing.slug}
                    disabled={catSaving || !catEditing.isNew}
                    onChange={(e) => setCatEditing((cur) => (cur ? { ...cur, slug: e.target.value } : cur))}
                    placeholder="auto từ tên"
                  />
                </div>
                <div className="fx-field">
                  <label>Thứ tự</label>
                  <input
                    type="number"
                    value={catEditing.sort}
                    disabled={catSaving}
                    onChange={(e) =>
                      setCatEditing((cur) => (cur ? { ...cur, sort: Number(e.target.value) || 0 } : cur))
                    }
                  />
                </div>
              </div>
              <div className="fx-field">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={catEditing.active}
                    disabled={catSaving}
                    onChange={(e) => setCatEditing((cur) => (cur ? { ...cur, active: e.target.checked } : cur))}
                  />
                  Hiển thị công khai
                </label>
              </div>
              {catErr && <div className="fx-err">{catErr}</div>}
            </div>
            <div className="fx-modal-foot">
              <button className="fx-btn" onClick={() => setCatEditing(null)} disabled={catSaving}>
                Huỷ
              </button>
              <button
                className="fx-btn fx-btn-primary"
                onClick={saveCategory}
                disabled={catSaving || !catEditing.label.trim()}
              >
                {catSaving ? (
                  <>
                    <IconLoader2 size={14} className="spin" /> Đang lưu…
                  </>
                ) : (
                  <>
                    <IconDeviceFloppy size={14} /> Lưu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .spin {
          animation: fx-spin 1s linear infinite;
        }
        @keyframes fx-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes drawer-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </AdminBody>
  );
}
