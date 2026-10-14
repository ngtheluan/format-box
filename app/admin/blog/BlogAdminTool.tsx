"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArticle,
  IconCheck,
  IconCircleDashedCheck,
  IconClock,
  IconDeviceFloppy,
  IconEdit,
  IconExternalLink,
  IconEye,
  IconLayoutGrid,
  IconLoader2,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import AdminBody from "../AdminBody";
import { useToast } from "@/components/Toast";
import type { BlogCategory, BlogPost, BlogStatus } from "@/lib/blog";

type Props = { initialPosts: BlogPost[] };
type StatusFilter = "all" | BlogStatus;

const STATUS_LABEL: Record<BlogStatus, string> = {
  draft: "Nháp",
  rejected: "Từ chối",
  published: "Đã duyệt",
};
const CAT_LABEL: Record<BlogCategory, string> = {
  tech: "Công nghệ",
  ai: "AI",
  web: "Web",
  mobile: "Mobile",
  devops: "DevOps",
};
const CAT_ORDER: BlogCategory[] = ["tech", "ai", "web", "mobile", "devops"];

export default function BlogAdminTool({ initialPosts }: Props) {
  const toast = useToast();
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Generate modal
  const [generateOpen, setGenerateOpen] = useState(false);
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
    if (!t) return;
    setGenLoading(true);
    setGenErr("");
    try {
      const r = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t }),
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
          tags: editing.tags.split(",").map((s) => s.trim()).filter(Boolean),
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
                tags: editing.tags.split(",").map((s) => s.trim()).filter(Boolean),
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

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin";
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
        <button onClick={() => setGenerateOpen(true)} className="fx-btn fx-btn-primary">
          <IconSparkles size={14} stroke={2.2} /> Sinh bài
        </button>
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
              <span className="fx-stat-lbl">Đã duyệt</span>
            </span>
          </div>
        </>
      }
    >
      {visible.length === 0 ? (
        <div className="fx-empty">
          <div className="fx-empty-ico">
            <IconArticle size={22} stroke={1.7} />
          </div>
          {posts.length === 0
            ? 'Chưa có bài. Bấm "Sinh bài" để tạo bài AI đầu tiên.'
            : "Không có kết quả phù hợp."}
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
              <div
                key={p.slug}
                className="fx-row"
                style={{ gridTemplateColumns: "32px 1fr 100px 110px 100px 160px" }}
              >
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
                    {CAT_LABEL[p.category]}
                  </span>
                </div>
                <div>
                  <span
                    className="fx-badge"
                    data-tone={
                      status === "published" ? "ok" : status === "rejected" ? "mute" : "info"
                    }
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
                  <Link href={`/blog/${p.slug}`} target="_blank" className="fx-btn fx-btn-icon" title="Xem">
                    <IconEye size={14} stroke={1.9} />
                  </Link>
                  <button className="fx-btn fx-btn-icon" onClick={() => startEdit(p)} title="Sửa">
                    <IconEdit size={14} stroke={1.9} />
                  </button>
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
        <div
          className="fx-modal-bg"
          style={{ zIndex: 200 }}
          onClick={(e) => e.target === e.currentTarget && !genLoading && setGenerateOpen(false)}
        >
          <div className="fx-modal" style={{ maxWidth: 560 }}>
            <div className="fx-modal-head">
              <h2>
                <IconSparkles size={16} stroke={2} /> Sinh bài blog
                <span className="fx-badge">AI</span>
              </h2>
              <button
                className="fx-btn fx-btn-icon fx-btn-ghost"
                onClick={() => !genLoading && setGenerateOpen(false)}
              >
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body">
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
              <p style={{ fontSize: 12, color: "var(--fg-muted, #888)", marginTop: 4 }}>
                AI sẽ sinh Markdown + 2-3 ảnh minh hoạ. Bài vào trạng thái <b>Nháp</b>, bạn duyệt sau.
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
                disabled={!topic.trim() || genLoading}
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
        <div
          className="fx-modal-bg"
          style={{ zIndex: 200 }}
          onClick={(e) => e.target === e.currentTarget && !saving && setEditing(null)}
        >
          <div className="fx-modal" style={{ maxWidth: 920, maxHeight: "78vh" }}>
            <div className="fx-modal-head">
              <h2>
                <IconEdit size={16} stroke={2} /> Sửa: {editing.title}
                <span className="fx-badge">
                  {editing.status ? STATUS_LABEL[editing.status] : "EDIT"}
                </span>
              </h2>
              <button
                className="fx-btn fx-btn-icon fx-btn-ghost"
                onClick={() => !saving && setEditing(null)}
              >
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
                      setEditing((cur) =>
                        cur ? { ...cur, category: e.target.value as BlogCategory } : cur,
                      )
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
                  onChange={(e) =>
                    setEditing((cur) => (cur ? { ...cur, title: e.target.value } : cur))
                  }
                />
              </div>
              <div className="fx-field">
                <label>Excerpt</label>
                <textarea
                  rows={2}
                  style={{ resize: "none" }}
                  value={editing.excerpt}
                  onChange={(e) =>
                    setEditing((cur) => (cur ? { ...cur, excerpt: e.target.value } : cur))
                  }
                />
              </div>
              <div className="fx-grid2">
                <div className="fx-field">
                  <label>Tags (phẩy phân cách)</label>
                  <input
                    value={editing.tags}
                    onChange={(e) =>
                      setEditing((cur) => (cur ? { ...cur, tags: e.target.value } : cur))
                    }
                  />
                </div>
                <div className="fx-field">
                  <label>Read min</label>
                  <input
                    type="number"
                    value={editing.readMin}
                    onChange={(e) =>
                      setEditing((cur) => (cur ? { ...cur, readMin: Number(e.target.value) } : cur))
                    }
                  />
                </div>
              </div>
              <div className="fx-field">
                <label>Markdown</label>
                <textarea
                  rows={8}
                  value={editing.markdown}
                  onChange={(e) =>
                    setEditing((cur) => (cur ? { ...cur, markdown: e.target.value } : cur))
                  }
                  style={{ fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.6 }}
                />
              </div>
              {editErr && <div className="fx-err">{editErr}</div>}
            </div>
            <div className="fx-modal-foot">
              <Link
                href={`/blog/${editing.slug}`}
                target="_blank"
                className="fx-btn"
                style={{ marginRight: "auto" }}
              >
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

      <style jsx global>{`
        .spin {
          animation: fx-spin 1s linear infinite;
        }
        @keyframes fx-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </AdminBody>
  );
}
