"use client";
import "@/app/blog/blog.css";
import "./blog-admin.css";
import { BlogCover } from "@/components/BlogCover";
import { useToast } from "@/components/Toast";
import type { BlogCategory, BlogCategoryRow, BlogPost, BlogStatus } from "@/lib/blog";
import {
  AI_MODELS,
  AI_PROVIDER_LABEL,
  GEN_LENGTHS,
  GEN_TONES,
  type AiProvider,
  type GenEvent,
  type GenLength,
  type GenStep,
  type GenTone,
  type ImageCandidate,
} from "@/lib/blog-ai-shared";
import {
  IconAlertTriangle,
  IconArticle,
  IconBulb,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconPhoto,
  IconPhotoPlus,
  IconPhotoSearch,
  IconPlayerSkipForward,
  IconTextGrammar,
  IconViewportNarrow,
  IconViewportWide,
  IconWand,
  IconWorldSearch,
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
  IconPin,
  IconPinFilled,
  IconRotateClockwise,
  IconSparkles,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { marked } from "marked";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminBody from "../AdminBody";
import ImagePicker from "./ImagePicker";

marked.setOptions({ gfm: true, breaks: false });

type Props = {
  initialPosts: BlogPost[];
  initialCategories: BlogCategoryRow[];
  providers: Record<AiProvider, boolean>;
};

type StepState = { status: "pending" | "start" | "done" | "skip"; detail?: string };
const STEP_LABEL: Record<GenStep, string> = {
  topic: "AI chọn chủ đề",
  research: "Tra cứu web",
  write: "Viết bài",
  images: "Tìm & duyệt ảnh liên quan",
  save: "Lưu nháp",
};
type AssistAction = "rewrite" | "expand" | "shorten" | "polish";
const ASSIST: { id: AssistAction; label: string; icon: JSX.Element }[] = [
  { id: "rewrite", label: "Viết lại", icon: <IconWand size={13} stroke={1.9} /> },
  { id: "expand", label: "Mở rộng", icon: <IconViewportWide size={13} stroke={1.9} /> },
  { id: "shorten", label: "Rút gọn", icon: <IconViewportNarrow size={13} stroke={1.9} /> },
  { id: "polish", label: "Trau chuốt", icon: <IconTextGrammar size={13} stroke={1.9} /> },
];

// Picker needs English keywords: prefer ASCII-only tags, else the de-accented title.
function photoQuery(title: string, tags: string[]) {
  const t = tags.filter((x) => /^[\x20-\x7e]+$/.test(x));
  const ascii = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d");
  return (t.length ? t.slice(0, 3).join(" ") : ascii.split(/\s+/).slice(0, 4).join(" ")).toLowerCase();
}
type StatusFilter = "all" | BlogStatus;

const STATUS_LABEL: Record<BlogStatus, string> = {
  draft: "Nháp",
  rejected: "Từ chối",
  published: "Phát hành",
};

export default function BlogAdminTool({ initialPosts, initialCategories, providers }: Props) {
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
  const firstProvider = (Object.keys(AI_MODELS) as AiProvider[]).find((p) => providers[p]) || "pollinations";
  const [genModel, setGenModel] = useState(`${firstProvider}|${AI_MODELS[firstProvider][0].id}`);
  const genProvider = genModel.split("|")[0] as AiProvider;
  const [genCategory, setGenCategory] = useState<BlogCategory>(initialCategories[0]?.slug || "tech");
  const [genTone, setGenTone] = useState<GenTone>("expert");
  const [genLength, setGenLength] = useState<GenLength>("medium");
  const [genImages, setGenImages] = useState(3);
  const [genResearch, setGenResearch] = useState(true);
  const [genNotes, setGenNotes] = useState("");
  const [topic, setTopic] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genErr, setGenErr] = useState("");
  const [genSteps, setGenSteps] = useState<Partial<Record<GenStep, StepState>>>({});
  const [genElapsed, setGenElapsed] = useState(0);
  const [ideas, setIdeas] = useState<{ title: string; angle: string }[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasTrending, setIdeasTrending] = useState(false);

  useEffect(() => {
    if (!genLoading) return;
    const t0 = Date.now();
    setGenElapsed(0);
    const id = setInterval(() => setGenElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [genLoading]);

  // Image picker + AI assist in the editor
  const [picker, setPicker] = useState<null | { target: "cover" | "inline"; query: string }>(null);
  const [assisting, setAssisting] = useState<string | null>(null);
  const [editView, setEditView] = useState<"write" | "preview">("write");
  const mdRef = useRef<HTMLTextAreaElement>(null);
  const [reimaging, setReimaging] = useState<string | null>(null);

  // Edit modal
  const [editing, setEditing] = useState<{
    slug: string;
    title: string;
    excerpt: string;
    category: BlogCategory;
    tags: string;
    readMin: number;
    markdown: string;
    coverImage?: string;
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
    setGenSteps({
      ...(genMode === "random" ? { topic: { status: "pending" } } : {}),
      research: { status: "pending" },
      write: { status: "pending" },
      images: { status: "pending" },
      save: { status: "pending" },
    });
    try {
      const r = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: genMode,
          provider: genProvider,
          model: genModel.split("|")[1],
          topic: genMode === "topic" ? t : undefined,
          category: genCategory,
          tone: genTone,
          length: genLength,
          images: genImages,
          research: genResearch,
          notes: genNotes,
        }),
      });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => null);
        setGenErr(j?.error || `Lỗi ${r.status}`);
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let created: BlogPost | null = null;
      const handle = (e: GenEvent) => {
        if (e.type === "step") setGenSteps((cur) => ({ ...cur, [e.step]: { status: e.status, detail: e.detail } }));
        else if (e.type === "error") setGenErr(e.error);
        else if (e.type === "done") created = e.post;
      };
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (line) handle(JSON.parse(line));
        }
      }
      if (buf.trim()) handle(JSON.parse(buf));
      const post = created as BlogPost | null;
      if (post) {
        setPosts((prev) => [{ ...post, status: "draft" }, ...prev.filter((p) => p.slug !== post.slug)]);
        setTopic("");
        setGenNotes("");
        setIdeas([]);
        setGenerateOpen(false);
        toast(`Đã sinh: ${post.title}`);
        openPreview(post);
      }
    } catch (e: any) {
      setGenErr(e?.message || "Lỗi");
    } finally {
      setGenLoading(false);
    }
  }

  async function suggestIdeas() {
    setIdeasLoading(true);
    setGenErr("");
    try {
      const r = await fetch("/api/blog/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: genCategory, provider: genProvider, trending: ideasTrending }),
      });
      const j = await r.json();
      if (!r.ok) return setGenErr(j?.error || `Lỗi ${r.status}`);
      setIdeas(j.ideas || []);
    } catch (e: any) {
      setGenErr(e?.message || "Lỗi");
    } finally {
      setIdeasLoading(false);
    }
  }

  async function togglePin(p: BlogPost) {
    const next = !p.pinned;
    // Optimistic flip; revert if API fails.
    setPosts((prev) => prev.map((x) => (x.slug === p.slug ? { ...x, pinned: next } : x)));
    try {
      const r = await fetch("/api/blog/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: p.slug, pinned: next }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `Lỗi ${r.status}`);
      toast(next ? `Đã ghim: ${p.title}` : `Đã bỏ ghim: ${p.title}`);
    } catch (e: any) {
      setPosts((prev) => prev.map((x) => (x.slug === p.slug ? { ...x, pinned: p.pinned } : x)));
      toast(e?.message || "Lỗi");
    }
  }

    async function reimage(p: BlogPost) {
    setReimaging(p.slug);
    try {
      const r = await fetch("/api/blog/reimage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: p.slug }),
      });
      const j = await r.json();
      if (!r.ok) return toast(j?.error || "Không chọn lại được ảnh");
      setPosts((prev) => prev.map((x) => (x.slug === p.slug ? { ...x, coverImage: j.coverImage || x.coverImage } : x)));
      toast(`Đã thay ${j.found}/${j.total} ảnh liên quan`);
    } catch (e: any) {
      toast(e?.message || "Lỗi");
    } finally {
      setReimaging(null);
    }
  }

  function pickImage(c: ImageCandidate) {
    if (!picker || !editing) return;
    const src = c.source === "unsplash" ? "Unsplash" : c.license ? `${c.license} · Openverse` : "Openverse";
    if (picker.target === "cover") {
      const credit = encodeURIComponent(JSON.stringify({ name: c.credit, url: c.creditUrl, source: src }));
      setEditing((cur) => (cur ? { ...cur, coverImage: `${c.url}#credit=${credit}` } : cur));
    } else {
      const ta = mdRef.current;
      const md = editing.markdown;
      const at = ta ? ta.selectionEnd : md.length;
      const alt = (c.alt.split(" · ")[0] || editing.title).replace(/[[\]]/g, "");
      const snippet = `\n\n![${alt}](${c.url})\n*Ảnh: [${c.credit.replace(/[[\]]/g, "")}](${c.creditUrl}) / ${src}*\n\n`;
      setEditing((cur) => (cur ? { ...cur, markdown: md.slice(0, at) + snippet + md.slice(at) } : cur));
    }
    setPicker(null);
  }

  async function assist(action: AssistAction | "meta") {
    if (!editing) return;
    const ta = mdRef.current;
    const md = editing.markdown;
    const [a, b] = ta ? [ta.selectionStart, ta.selectionEnd] : [0, 0];
    if (action !== "meta" && (editView !== "write" || a === b)) {
      toast("Bôi đen đoạn văn cần AI chỉnh trong ô Markdown");
      return;
    }
    setAssisting(action);
    try {
      const r = await fetch("/api/blog/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          provider: genProvider,
          title: editing.title,
          text: action === "meta" ? md : md.slice(a, b),
        }),
      });
      const j = await r.json();
      if (!r.ok) return toast(j?.error || "AI lỗi");
      if (action === "meta") {
        setEditing((cur) =>
          cur
            ? {
                ...cur,
                title: j.meta.title || cur.title,
                excerpt: j.meta.excerpt || cur.excerpt,
                tags: Array.isArray(j.meta.tags) ? j.meta.tags.join(", ") : cur.tags,
              }
            : cur,
        );
        toast("Đã gợi ý tiêu đề, mô tả, tags");
      } else {
        setEditing((cur) => (cur ? { ...cur, markdown: md.slice(0, a) + j.text + md.slice(b) } : cur));
        requestAnimationFrame(() => {
          ta?.focus();
          ta?.setSelectionRange(a, a + j.text.length);
        });
      }
    } catch (e: any) {
      toast(e?.message || "Lỗi");
    } finally {
      setAssisting(null);
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
        coverImage: j.post.coverImage || "",
        status: j.post.status,
      });
      setEditView("write");
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
          coverImage: editing.coverImage || null,
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
                coverImage: editing.coverImage || undefined,
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
            Chưa có danh mục. Bấm &quot;Thêm danh mục&quot; để tạo mới.
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
          <div className="fx-row fx-row-head" style={{ gridTemplateColumns: "56px 1fr 100px 110px 100px 190px" }}>
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
                className="fx-row blog-row"
                style={{ gridTemplateColumns: "56px 1fr 100px 110px 100px 190px" }}
              >
                <div className="bga-thumb">
                  {p.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverImage.split("#")[0].replace(/([?&])w=\d+/, "$1w=160").replace(/([?&])h=\d+/, "$1h=100")} alt="" loading="lazy" />
                  ) : (
                    <span style={{ background: `linear-gradient(135deg, ${p.cover.from}, ${p.cover.to})` }} />
                  )}
                </div>
                <div
                  className="fx-title-cell blog-title-click"
                  onClick={() => (status === "published" ? openPreview(p) : startEdit(p))}
                  style={{ cursor: "pointer" }}
                  title={status === "published" ? "Xem thử" : "Sửa"}
                >
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
                  <button
                    className="fx-btn fx-btn-icon"
                    onClick={() => togglePin(p)}
                    title={p.pinned ? "Bỏ ghim" : "Ghim lên đầu /blog"}
                    style={p.pinned ? { color: "var(--warn, #f59e0b)" } : undefined}
                  >
                    {p.pinned ? <IconPinFilled size={14} stroke={1.9} /> : <IconPin size={14} stroke={1.9} />}
                  </button>
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
                      <button
                        className="fx-btn fx-btn-icon"
                        onClick={() => reimage(p)}
                        disabled={reimaging === p.slug}
                        title="AI chọn lại ảnh liên quan (bìa + ảnh tự động trong bài)"
                      >
                        {reimaging === p.slug ? (
                          <IconLoader2 size={14} className="spin" />
                        ) : (
                          <IconPhotoSearch size={14} stroke={1.9} />
                        )}
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
          <div className="fx-modal" style={{ maxWidth: 760, width: "95vw" }}>
            <div className="fx-modal-head">
              <h2>
                <IconSparkles size={16} stroke={2} /> Sinh bài blog
                <span className="fx-badge">AI · miễn phí</span>
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => !genLoading && setGenerateOpen(false)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body">
              <fieldset disabled={genLoading} className="bga-gen">
                <div className="bga-row">
                  <div className="bga-seg">
                    {(
                      [
                        ["topic", "Tự nhập chủ đề"],
                        ["random", "AI tự chọn chủ đề"],
                      ] as const
                    ).map(([k, label]) => (
                      <button key={k} type="button" className={genMode === k ? "is-on" : ""} onClick={() => setGenMode(k)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="bga-check" title="Tra cứu web trước khi viết để có dữ kiện mới, kèm nguồn tham khảo">
                    <button
                      type="button"
                      className={`fx-switch${genResearch ? " on" : ""}`}
                      onClick={() => setGenResearch((v) => !v)}
                      aria-pressed={genResearch}
                    />
                    <IconWorldSearch size={14} stroke={1.9} /> Tra cứu web
                  </label>
                </div>

                <div className="bga-grid3">
                  <div className="fx-field">
                    <label>Danh mục</label>
                    <select value={genCategory} onChange={(e) => setGenCategory(e.target.value as BlogCategory)}>
                      {CAT_ORDER.map((c) => (
                        <option key={c} value={c}>
                          {CAT_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fx-field">
                    <label>Model</label>
                    <select value={genModel} onChange={(e) => setGenModel(e.target.value)}>
                      {(Object.keys(AI_MODELS) as AiProvider[]).map((p) => (
                        <optgroup key={p} label={`${AI_PROVIDER_LABEL[p]}${providers[p] ? "" : " (chưa có key)"}`}>
                          {AI_MODELS[p].map((m) => (
                            <option key={m.id} value={`${p}|${m.id}`} disabled={!providers[p]}>
                              {m.label}
                              {m.search ? " · web" : ""}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="fx-field">
                    <label>Giọng văn</label>
                    <select value={genTone} onChange={(e) => setGenTone(e.target.value as GenTone)}>
                      {GEN_TONES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fx-field">
                    <label>Độ dài</label>
                    <div className="bga-seg">
                      {GEN_LENGTHS.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          className={genLength === l.id ? "is-on" : ""}
                          onClick={() => setGenLength(l.id)}
                          title={`${l.words} từ`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="fx-field">
                    <label>Ảnh trong bài</label>
                    <div className="bga-seg">
                      {[0, 1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={genImages === n ? "is-on" : ""}
                          onClick={() => setGenImages(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="fx-field">
                    <label>Gợi ý chủ đề</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="fx-btn"
                        style={{ flex: 1, justifyContent: "center" }}
                        onClick={suggestIdeas}
                        disabled={ideasLoading}
                      >
                        {ideasLoading ? <IconLoader2 size={14} className="spin" /> : <IconBulb size={14} />} Gợi ý
                      </button>
                      <button
                        type="button"
                        className={`fx-btn fx-btn-icon${ideasTrending ? " fx-btn-primary" : ""}`}
                        onClick={() => setIdeasTrending((v) => !v)}
                        title="Gợi ý theo xu hướng mới (tra cứu web)"
                      >
                        <IconWorldSearch size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {ideas.length > 0 && (
                  <div className="bga-ideas">
                    {ideas.map((i) => (
                      <button
                        key={i.title}
                        type="button"
                        className={topic === i.title ? "is-on" : ""}
                        onClick={() => {
                          setGenMode("topic");
                          setTopic(i.title);
                          if (i.angle && !genNotes) setGenNotes(i.angle);
                        }}
                      >
                        <b>{i.title}</b>
                        {i.angle && <span>{i.angle}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {genMode === "topic" && (
                  <div className="fx-field">
                    <label>Chủ đề *</label>
                    <input
                      autoFocus
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && generate()}
                      placeholder="VD: WebGPU cho người mới 2026, Rust vs Go cho backend…"
                    />
                  </div>
                )}
                <div className="fx-field">
                  <label>Yêu cầu thêm (tuỳ chọn)</label>
                  <textarea
                    rows={2}
                    style={{ resize: "vertical" }}
                    value={genNotes}
                    onChange={(e) => setGenNotes(e.target.value)}
                    placeholder="Đối tượng đọc, ý bắt buộc có, ví dụ cần đưa vào, điều cần tránh…"
                  />
                </div>
              </fieldset>

              {Object.keys(genSteps).length > 0 && (
                <ol className="bga-steps" aria-live="polite">
                  {(Object.keys(STEP_LABEL) as GenStep[])
                    .filter((k) => genSteps[k])
                    .map((k) => {
                      const st = genSteps[k]!;
                      return (
                        <li key={k} data-status={st.status}>
                          <span className="bga-step-ico">
                            {st.status === "done" ? (
                              <IconCircleCheckFilled size={16} />
                            ) : st.status === "start" ? (
                              <IconLoader2 size={16} className="spin" />
                            ) : st.status === "skip" ? (
                              <IconPlayerSkipForward size={15} />
                            ) : (
                              <IconCircleDashed size={16} />
                            )}
                          </span>
                          <b>{STEP_LABEL[k]}</b>
                          {st.detail && <span className="bga-step-detail">{st.detail}</span>}
                        </li>
                      );
                    })}
                </ol>
              )}
              {genErr && (
                <div className="fx-err" style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <IconAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {genErr}
                </div>
              )}
              <p className="bga-hint">
                Bài được viết bằng AI miễn phí (tự chuyển model khác nếu hết lượt), ảnh là ảnh chụp thật tìm trên
                Unsplash/Openverse và được AI duyệt đúng ngữ cảnh. Bài vào trạng thái <b>Nháp</b> để bạn duyệt.
              </p>
            </div>
            <div className="fx-modal-foot">
              {genLoading && <span className="bga-elapsed">{genElapsed}s</span>}
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
                    <IconLoader2 size={14} className="spin" /> Đang sinh…
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
          <div className="fx-modal" style={{ maxWidth: 1240, width: "96vw", maxHeight: "94vh" }}>
            <div className="fx-modal-head">
              <h2>
                <IconEdit size={16} stroke={2} /> Sửa bài
                <span className="fx-badge">{editing.status ? STATUS_LABEL[editing.status] : "EDIT"}</span>
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => !saving && setEditing(null)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body bga-edit" style={{ maxHeight: "calc(94vh - 130px)" }}>
              <div className="bga-edit-side">
                <div className="bga-cover">
                  {editing.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editing.coverImage.split("#")[0]} alt="" />
                  ) : (
                    <div className="bga-cover-empty">
                      <IconPhoto size={22} stroke={1.6} /> Chưa có ảnh bìa (dùng gradient)
                    </div>
                  )}
                  <div className="bga-cover-actions">
                    <button
                      type="button"
                      className="fx-btn"
                      onClick={() =>
                        setPicker({
                          target: "cover",
                          query: photoQuery(editing.title, editing.tags.split(",").map((s) => s.trim())),
                        })
                      }
                    >
                      <IconPhotoSearch size={14} /> Đổi ảnh bìa
                    </button>
                    {editing.coverImage && (
                      <button
                        type="button"
                        className="fx-btn fx-btn-icon fx-btn-danger"
                        title="Bỏ ảnh bìa"
                        onClick={() => setEditing((cur) => (cur ? { ...cur, coverImage: "" } : cur))}
                      >
                        <IconTrash size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="fx-field">
                  <label>
                    Title *
                    <button
                      type="button"
                      className="bga-inline-ai"
                      onClick={() => assist("meta")}
                      disabled={!!assisting}
                      title="AI gợi ý tiêu đề, mô tả, tags từ nội dung"
                    >
                      {assisting === "meta" ? <IconLoader2 size={12} className="spin" /> : <IconSparkles size={12} />}{" "}
                      AI gợi ý
                    </button>
                  </label>
                  <input
                    value={editing.title}
                    onChange={(e) => setEditing((cur) => (cur ? { ...cur, title: e.target.value } : cur))}
                  />
                </div>
                <div className="fx-field">
                  <label>Excerpt</label>
                  <textarea
                    rows={3}
                    style={{ resize: "none" }}
                    value={editing.excerpt}
                    onChange={(e) => setEditing((cur) => (cur ? { ...cur, excerpt: e.target.value } : cur))}
                  />
                </div>
                <div className="fx-grid2">
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
                  <div className="fx-field">
                    <label>Phút đọc</label>
                    <input
                      type="number"
                      value={editing.readMin}
                      onChange={(e) => setEditing((cur) => (cur ? { ...cur, readMin: Number(e.target.value) } : cur))}
                    />
                  </div>
                </div>
                <div className="fx-field">
                  <label>Tags (phẩy phân cách)</label>
                  <input
                    value={editing.tags}
                    onChange={(e) => setEditing((cur) => (cur ? { ...cur, tags: e.target.value } : cur))}
                  />
                </div>
                <div className="fx-field">
                  <label>Slug</label>
                  <input value={editing.slug} disabled />
                </div>
              </div>

              <div className="bga-edit-main">
                <div className="bga-toolbar">
                  <div className="bga-seg">
                    <button
                      type="button"
                      className={editView === "write" ? "is-on" : ""}
                      onClick={() => setEditView("write")}
                    >
                      <IconEdit size={13} /> Soạn
                    </button>
                    <button
                      type="button"
                      className={editView === "preview" ? "is-on" : ""}
                      onClick={() => setEditView("preview")}
                    >
                      <IconEye size={13} /> Xem trước
                    </button>
                  </div>
                  <button
                    type="button"
                    className="fx-btn"
                    disabled={editView !== "write"}
                    onClick={() =>
                      setPicker({
                        target: "inline",
                        query: photoQuery(editing.title, editing.tags.split(",").map((s) => s.trim())),
                      })
                    }
                    title="Chèn ảnh tại vị trí con trỏ"
                  >
                    <IconPhotoPlus size={14} /> Chèn ảnh
                  </button>
                  <span className="bga-toolbar-sep" />
                  <span className="bga-toolbar-label">
                    <IconSparkles size={13} /> AI với đoạn bôi đen:
                  </span>
                  {ASSIST.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      className="fx-btn"
                      disabled={!!assisting || editView !== "write"}
                      onClick={() => assist(x.id)}
                    >
                      {assisting === x.id ? <IconLoader2 size={13} className="spin" /> : x.icon} {x.label}
                    </button>
                  ))}
                </div>
                {editView === "write" ? (
                  <textarea
                    ref={mdRef}
                    className="bga-md"
                    value={editing.markdown}
                    onChange={(e) => setEditing((cur) => (cur ? { ...cur, markdown: e.target.value } : cur))}
                    spellCheck={false}
                  />
                ) : (
                  <div
                    className="bga-md-preview blog-body"
                    dangerouslySetInnerHTML={{ __html: marked.parse(editing.markdown) as string }}
                  />
                )}
              </div>
              {editErr && <div className="fx-err" style={{ gridColumn: "1 / -1" }}>{editErr}</div>}
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

      {picker && editing && (
        <ImagePicker
          title={picker.target === "cover" ? "Chọn ảnh bìa" : "Chèn ảnh vào bài"}
          initialQuery={picker.query}
          onPick={pickImage}
          onClose={() => setPicker(null)}
        />
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
        body:has(.fx-modal-bg) .fx-stripe,
        body:has(.fx-modal-bg) .fx-top,
        body:has(.fx-modal-bg) .fx-stats,
        body:has(.fx-modal-bg) .fx-tabs {
          display: none !important;
        }
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
        .blog-title-click:hover b {
          color: var(--accent, #f97316);
        }
        @media (max-width: 760px) {
          .fx-row-head {
            display: none !important;
          }
          .fx-table:has(.blog-row) {
            overflow: visible !important;
          }
          .blog-row {
            min-width: 0 !important;
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 56px auto auto 1fr !important;
            grid-template-areas:
              "ico title title title"
              "ico cat   stat  date"
              "act act   act   act" !important;
            gap: 8px 10px !important;
            padding: 12px !important;
            align-items: center !important;
            border-radius: 10px;
            border: 1px solid var(--border);
            margin-bottom: 10px;
            background: var(--bg2, transparent);
          }
          .blog-row .bga-thumb {
            grid-area: ico;
            align-self: start;
          }
          .blog-row .fx-title-cell {
            grid-area: title;
            min-width: 0;
          }
          .blog-row .fx-title-cell b {
            font-size: 15px !important;
            line-height: 1.35 !important;
            display: block;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
          .blog-row .fx-title-cell .fx-t-href {
            display: none;
          }
          .blog-row .fx-title-cell .fx-t-sub {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            font-size: 12px;
            margin-top: 2px;
          }
          .blog-row > div:nth-child(3) {
            grid-area: cat;
            justify-self: start;
          }
          .blog-row > div:nth-child(4) {
            grid-area: stat;
            justify-self: start;
          }
          .blog-row > div:nth-child(5) {
            grid-area: date;
            justify-self: end;
            font-size: 11px !important;
            white-space: nowrap;
          }
          .blog-row .fx-row-actions {
            grid-area: act;
            display: flex !important;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 6px;
            padding-top: 10px;
            border-top: 1px dashed var(--border);
            margin-top: 4px;
          }
          .blog-row .fx-row-actions .fx-btn-icon {
            min-width: 38px;
            min-height: 36px;
          }
        }
      `}</style>
    </AdminBody>
  );
}
