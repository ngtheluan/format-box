"use client";
import "@/app/blog/blog.css";
import { useToast } from "@/components/Toast";
import type { SelectOption } from "@/components/ui";
import { Field, Input, Select, Switch, Tab, TabPanel, Tabs, TabsList, Textarea } from "@/components/ui";
import { rewriteImgUrl, type BlogCategory, type BlogCategoryRow, type BlogPost, type BlogStatus } from "@/lib/blog";
import {
  AI_MODELS,
  AI_PROVIDER_LABEL,
  GEN_AUDIENCES,
  GEN_CTAS,
  GEN_EXTRAS,
  GEN_IMAGE_STYLES,
  GEN_LENGTHS,
  GEN_REGIONS,
  GEN_STRUCTURES,
  GEN_TONES,
  type AiProvider,
  type GenAudience,
  type GenCta,
  type GenEvent,
  type GenExtra,
  type GenImageStyle,
  type GenLength,
  type GenRegion,
  type GenStep,
  type GenStructure,
  type GenTone,
  type ImageCandidate,
} from "@/lib/blog-ai-shared";
import {
  IconAlertTriangle,
  IconArticle,
  IconBrain,
  IconBulb,
  IconCategory,
  IconCheck,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconCircleDashedCheck,
  IconClock,
  IconDeviceFloppy,
  IconEdit,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconLayoutGrid,
  IconLayoutList,
  IconLink,
  IconLoader2,
  IconMessageCircle,
  IconMicrophone,
  IconPalette,
  IconPhoto,
  IconPhotoPlus,
  IconPhotoSearch,
  IconPin,
  IconPinFilled,
  IconPlayerSkipForward,
  IconPlus,
  IconRotateClockwise,
  IconSearch,
  IconSparkles,
  IconTarget,
  IconTextGrammar,
  IconTrash,
  IconUsers,
  IconViewportNarrow,
  IconViewportWide,
  IconWand,
  IconWorldSearch,
  IconWriting,
  IconX,
} from "@tabler/icons-react";
import { marked } from "marked";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminBody from "../AdminBody";
import "./blog-admin.css";
import ImagePicker from "./ImagePicker";

marked.setOptions({ gfm: true, breaks: false });

type Props = {
  initialPosts: BlogPost[];
  initialCategories: BlogCategoryRow[];
  providers: Record<AiProvider, boolean>;
};

type StepState = {
  status: "pending" | "start" | "done" | "skip";
  detail?: string;
  startedAt?: number;
  durationMs?: number;
};
const STEP_LABEL: Record<GenStep, string> = {
  topic: "AI chọn chủ đề",
  research: "Tra cứu web",
  outline: "Lập dàn ý",
  write: "Viết bài",
  factcheck: "Kiểm chứng dữ kiện",
  linking: "Chèn liên kết nội bộ",
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
  const ascii = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d");
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
  const [genAudience, setGenAudience] = useState<GenAudience>("intermediate");
  const [genStructure, setGenStructure] = useState<GenStructure>("auto");
  const [genSeoKeyword, setGenSeoKeyword] = useState("");
  const [genExtras, setGenExtras] = useState<GenExtra[]>(["tldr"]);
  const [genCta, setGenCta] = useState<GenCta>("none");
  const [genRegion, setGenRegion] = useState<GenRegion>("vn");
  const [genImageStyle, setGenImageStyle] = useState<GenImageStyle>("mixed");
  const [genFactCheck, setGenFactCheck] = useState(false);
  const [genInternalLinks, setGenInternalLinks] = useState(true);
  const [genTab, setGenTab] = useState("content");
  const [topic, setTopic] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genErr, setGenErr] = useState("");
  const [genSteps, setGenSteps] = useState<Partial<Record<GenStep, StepState>>>({});
  const [genElapsed, setGenElapsed] = useState(0);
  const [genAborted, setGenAborted] = useState(false);
  const genAbortRef = useRef<AbortController | null>(null);
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

  const MAX_PINNED = 4;

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

  function cancelGenerate() {
    genAbortRef.current?.abort();
    setGenAborted(true);
  }

  async function generate() {
    const t = topic.trim();
    if (genMode === "topic" && !t) return;
    const ac = new AbortController();
    genAbortRef.current = ac;
    setGenAborted(false);
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
        signal: ac.signal,
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
          audience: genAudience,
          structure: genStructure,
          seoKeyword: genSeoKeyword,
          extras: genExtras,
          cta: genCta,
          region: genRegion,
          imageStyle: genImageStyle,
          factCheck: genFactCheck,
          internalLinks: genInternalLinks,
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
        if (e.type === "ping") return;
        if (e.type === "step")
          setGenSteps((cur) => {
            const prev = cur[e.step];
            const now = Date.now();
            if (e.status === "start")
              return { ...cur, [e.step]: { status: "start", detail: e.detail, startedAt: now } };
            if (e.status === "done" || e.status === "skip") {
              const dur = prev?.startedAt ? now - prev.startedAt : prev?.durationMs;
              return {
                ...cur,
                [e.step]: { ...prev, status: e.status, detail: e.detail ?? prev?.detail, durationMs: dur },
              };
            }
            return cur;
          });
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
      }
    } catch (e: any) {
      if (ac.signal.aborted) setGenErr("Đã huỷ sinh bài");
      else {
        const msg = String(e?.message || e || "");
        if (/fetch failed|network|aborted/i.test(msg))
          setGenErr("Kết nối bị gián đoạn — có thể do mạng hoặc server quá tải. Hãy thử lại.");
        else setGenErr(msg || "Lỗi không xác định");
      }
    } finally {
      setGenLoading(false);
      genAbortRef.current = null;
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
    if (next) {
      const count = posts.filter((x) => x.pinned).length;
      if (count >= MAX_PINNED) {
        toast(`Chỉ được ghim tối đa ${MAX_PINNED} bài`);
        return;
      }
    }
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
            data-tone="mute"
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
            data-tone="err"
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
          {(() => {
            const pinnedCount = posts.filter((x) => x.pinned).length;
            return visible.map((p) => {
              const status = (p.status || "published") as BlogStatus;
              const canShowPin = p.pinned || pinnedCount < MAX_PINNED;
              return (
                <div
                  key={p.slug}
                  className="fx-row blog-row"
                  style={{ gridTemplateColumns: "56px 1fr 100px 110px 100px 190px" }}
                >
                  <div className="bga-thumb">
                    {p.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rewriteImgUrl(
                          p.coverImage
                          .split("#")[0]
                          .replace(/([?&])w=\d+/, "$1w=160")
                          .replace(/([?&])h=\d+/, "$1h=100"),
                        )}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span style={{ background: `linear-gradient(135deg, ${p.cover.from}, ${p.cover.to})` }} />
                    )}
                  </div>
                  <div
                    className="fx-title-cell blog-title-click"
                    onClick={() => startEdit(p)}
                    style={{ cursor: "pointer" }}
                    title="Sửa"
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
                      data-tone={status === "published" ? "ok" : status === "rejected" ? "err" : "mute"}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted, #888)" }}>{p.date}</div>
                  <div className="fx-row-actions">
                    {canShowPin && (
                      <button
                        className="fx-btn fx-btn-icon"
                        onClick={() => togglePin(p)}
                        title={p.pinned ? "Bỏ ghim" : "Ghim lên đầu /blog"}
                        style={p.pinned ? { color: "var(--warn, #f59e0b)" } : undefined}
                      >
                        {p.pinned ? <IconPinFilled size={14} stroke={1.9} /> : <IconPin size={14} stroke={1.9} />}
                      </button>
                    )}
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
                    ) : null}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* GENERATE MODAL */}
      {generateOpen && (
        <div className="fx-modal-bg" style={{ zIndex: 200 }}>
          <div className="fx-modal" style={{ maxWidth: 880, width: "96vw" }}>
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
              {genLoading || (Object.keys(genSteps).length > 0 && (genAborted || genErr)) ? (
                (() => {
                  const keys = (Object.keys(STEP_LABEL) as GenStep[]).filter((k) => genSteps[k]);
                  const total = keys.length;
                  const done = keys.filter(
                    (k) => genSteps[k]!.status === "done" || genSteps[k]!.status === "skip",
                  ).length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  const activeIdx = keys.findIndex((k) => genSteps[k]!.status === "start");
                  const activeLabel = activeIdx >= 0 ? STEP_LABEL[keys[activeIdx]] : null;
                  return (
                    <div className="bga-progress-inline">
                      <div className="bga-progress-head">
                        <div className="bga-progress-title">
                          {genLoading ? (
                            <>
                              <IconLoader2 size={13} className="spin" />
                              <span>{activeLabel || "Chuẩn bị…"}</span>
                            </>
                          ) : genAborted ? (
                            <>
                              <IconX size={13} stroke={2} /> Đã huỷ
                            </>
                          ) : (
                            <>
                              <IconAlertTriangle size={13} /> Dừng với lỗi
                            </>
                          )}
                        </div>
                        <div className="bga-progress-meta">
                          <span>
                            {done}/{total} bước
                          </span>
                          <span className="bga-progress-pct">{pct}%</span>
                          <span className="bga-elapsed-chip">{genElapsed}s</span>
                        </div>
                      </div>
                      <div className="bga-progress-bar">
                        <div className="bga-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <ol className="bga-steps" style={{ marginTop: 14 }}>
                        {keys.map((k) => {
                          const st = genSteps[k]!;
                          const dur = st.durationMs;
                          return (
                            <li key={k} data-status={st.status}>
                              <span className="bga-step-ico">
                                {st.status === "done" ? (
                                  <IconCircleCheckFilled size={18} />
                                ) : st.status === "start" ? (
                                  <IconLoader2 size={18} className="spin" />
                                ) : st.status === "skip" ? (
                                  <IconPlayerSkipForward size={17} />
                                ) : (
                                  <IconCircleDashed size={18} />
                                )}
                              </span>
                              <div className="bga-step-main">
                                <div className="bga-step-top">
                                  <b>{STEP_LABEL[k]}</b>
                                  {dur != null && dur > 0 && (
                                    <span className="bga-step-dur">{(dur / 1000).toFixed(1)}s</span>
                                  )}
                                </div>
                                {st.detail && <span className="bga-step-detail">{st.detail}</span>}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                      {genErr && (
                        <div
                          className="fx-err"
                          style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 10 }}
                        >
                          <IconAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {genErr}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <>
                  <fieldset disabled={genLoading} className="bga-gen4">
                    {/* HERO — mode + presets */}
                    <div className="bga-hero">
                      <div className="bga-seg bga-seg-pill">
                        {(
                          [
                            ["topic", "Tự nhập", <IconWriting key="i" size={13} stroke={1.9} />],
                            ["random", "AI chọn", <IconSparkles key="i" size={13} stroke={1.9} />],
                          ] as const
                        ).map(([k, label, ic]) => (
                          <button
                            key={k}
                            type="button"
                            className={genMode === k ? "is-on" : ""}
                            onClick={() => setGenMode(k)}
                          >
                            {ic} {label}
                          </button>
                        ))}
                      </div>
                      <div className="bga-presets" title="Preset nhanh — nạp sẵn phong cách & cấu trúc">
                        {(
                          [
                            {
                              id: "tutorial",
                              label: "Hướng dẫn kỹ thuật",
                              ic: <IconWriting size={12} stroke={1.9} />,
                              apply: () => {
                                setGenTone("tutorial");
                                setGenStructure("howto");
                                setGenAudience("intermediate");
                                setGenLength("long");
                                setGenExtras(["tldr", "code"]);
                              },
                            },
                            {
                              id: "review",
                              label: "Review sản phẩm",
                              ic: <IconPalette size={12} stroke={1.9} />,
                              apply: () => {
                                setGenTone("analysis");
                                setGenStructure("review");
                                setGenAudience("mixed");
                                setGenLength("medium");
                                setGenExtras(["tldr", "faq"]);
                              },
                            },
                            {
                              id: "deepdive",
                              label: "Phân tích chuyên sâu",
                              ic: <IconBrain size={12} stroke={1.9} />,
                              apply: () => {
                                setGenTone("expert");
                                setGenStructure("deepdive");
                                setGenAudience("expert");
                                setGenLength("long");
                                setGenExtras(["stats"]);
                              },
                            },
                            {
                              id: "news",
                              label: "Tin xu hướng",
                              ic: <IconWorldSearch size={12} stroke={1.9} />,
                              apply: () => {
                                setGenTone("friendly");
                                setGenStructure("news");
                                setGenAudience("mixed");
                                setGenLength("short");
                                setGenExtras(["tldr", "stats"]);
                                setGenResearch(true);
                              },
                            },
                          ] as const
                        ).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="bga-preset-btn"
                            onClick={p.apply}
                            title={`Preset: ${p.label}`}
                          >
                            {p.ic} {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* TOPIC — big input + ideas */}
                    {genMode === "topic" ? (
                      <div className="bga-topic-wrap">
                        <Input
                          autoFocus
                          className="bga-topic-input"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !genLoading && generate()}
                          placeholder="Nhập chủ đề của bạn… (VD: WebGPU cho người mới 2026)"
                          leftIcon={<IconTarget size={16} stroke={1.9} />}
                          rightSlot={
                            <div className="bga-topic-tools">
                              <button
                                type="button"
                                className={`bga-tool-btn${ideasTrending ? " is-on" : ""}`}
                                onClick={() => setIdeasTrending((v) => !v)}
                                title="Gợi ý theo xu hướng mới (tra cứu web)"
                              >
                                <IconWorldSearch size={14} />
                              </button>
                              <button
                                type="button"
                                className="bga-tool-btn"
                                onClick={suggestIdeas}
                                disabled={ideasLoading}
                                title="Gợi ý ý tưởng từ AI"
                              >
                                {ideasLoading ? <IconLoader2 size={14} className="spin" /> : <IconBulb size={14} />}
                              </button>
                            </div>
                          }
                        />
                      </div>
                    ) : (
                      <div className="bga-random-info">
                        <IconSparkles size={16} stroke={2} />
                        <span>
                          AI sẽ tự chọn chủ đề mới cho danh mục <b>{CAT_LABEL[genCategory] || genCategory}</b>
                        </span>
                      </div>
                    )}

                    {ideas.length > 0 && (
                      <div className="bga-ideas bga-ideas-compact">
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

                    {/* TABS — Nội dung / Phong cách / AI & Nâng cao */}
                    <Tabs value={genTab} onValueChange={setGenTab} variant="segment">
                      <TabsList>
                        <Tab value="content">
                          <IconArticle size={13} stroke={1.9} /> Nội dung
                        </Tab>
                        <Tab value="style">
                          <IconPalette size={13} stroke={1.9} /> Phong cách
                        </Tab>
                        <Tab value="advanced">
                          <IconBrain size={13} stroke={1.9} /> AI & Nâng cao
                        </Tab>
                      </TabsList>

                      <TabPanel value="content">
                        <div className="bga-grid-dense">
                          <Field
                            label={
                              <>
                                <IconLayoutList size={11} stroke={1.9} /> Danh mục
                              </>
                            }
                          >
                            <Select
                              value={genCategory}
                              onChange={(e) => setGenCategory(e.target.value as BlogCategory)}
                              options={CAT_ORDER.map((c) => ({ value: c, label: CAT_LABEL[c] || c }))}
                              selectSize="sm"
                            />
                          </Field>
                          <Field label="Độ dài">
                            <div className="bga-seg bga-seg-sm">
                              {GEN_LENGTHS.map((l) => (
                                <button
                                  key={l.id}
                                  type="button"
                                  className={genLength === l.id ? "is-on" : ""}
                                  onClick={() => setGenLength(l.id)}
                                  title={`${l.words} từ · ${l.sections} section`}
                                >
                                  {l.label}
                                </button>
                              ))}
                            </div>
                          </Field>
                          <Field
                            label={
                              <>
                                <IconPhoto size={11} stroke={1.9} /> Số ảnh
                              </>
                            }
                          >
                            <div className="bga-seg bga-seg-sm">
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
                          </Field>
                        </div>

                        <div className="bga-inline-row" style={{ marginTop: 10 }}>
                          <Field
                            label={
                              <>
                                <IconSearch size={11} stroke={1.9} /> Từ khoá SEO
                              </>
                            }
                          >
                            <Input
                              value={genSeoKeyword}
                              onChange={(e) => setGenSeoKeyword(e.target.value)}
                              placeholder="webgpu là gì…"
                              inputSize="sm"
                            />
                          </Field>
                          <Field label="Phần phụ">
                            <div className="bga-chips">
                              {GEN_EXTRAS.map((x) => {
                                const on = genExtras.includes(x.id);
                                return (
                                  <button
                                    key={x.id}
                                    type="button"
                                    className={`bga-chip${on ? " is-on" : ""}`}
                                    onClick={() =>
                                      setGenExtras((prev) => (on ? prev.filter((e) => e !== x.id) : [...prev, x.id]))
                                    }
                                    title={x.hint}
                                  >
                                    {on ? <IconCheck size={11} stroke={2.4} /> : <IconPlus size={11} stroke={2} />}
                                    {x.label}
                                  </button>
                                );
                              })}
                            </div>
                          </Field>
                        </div>

                        <Field
                          label={
                            <>
                              <IconMessageCircle size={11} stroke={1.9} /> Yêu cầu thêm (tuỳ chọn)
                            </>
                          }
                        >
                          <Textarea
                            rows={2}
                            value={genNotes}
                            onChange={(e) => setGenNotes(e.target.value)}
                            placeholder="Ý bắt buộc có, ví dụ cần đưa vào, điều cần tránh…"
                            autoGrow
                          />
                        </Field>
                      </TabPanel>

                      <TabPanel value="style">
                        <div className="bga-grid-dense">
                          <Field
                            label={
                              <>
                                <IconMicrophone size={11} stroke={1.9} /> Giọng văn
                              </>
                            }
                            hint={GEN_TONES.find((t) => t.id === genTone)?.hint}
                          >
                            <Select
                              value={genTone}
                              onChange={(e) => setGenTone(e.target.value as GenTone)}
                              options={GEN_TONES.map((t) => ({ value: t.id, label: t.label }))}
                              selectSize="sm"
                            />
                          </Field>
                          <Field
                            label={
                              <>
                                <IconUsers size={11} stroke={1.9} /> Đối tượng
                              </>
                            }
                            hint={GEN_AUDIENCES.find((a) => a.id === genAudience)?.hint}
                          >
                            <Select
                              value={genAudience}
                              onChange={(e) => setGenAudience(e.target.value as GenAudience)}
                              options={GEN_AUDIENCES.map((a) => ({ value: a.id, label: a.label }))}
                              selectSize="sm"
                            />
                          </Field>
                          <Field
                            label={
                              <>
                                <IconArticle size={11} stroke={1.9} /> Cấu trúc
                              </>
                            }
                            hint={GEN_STRUCTURES.find((s) => s.id === genStructure)?.hint}
                          >
                            <Select
                              value={genStructure}
                              onChange={(e) => setGenStructure(e.target.value as GenStructure)}
                              options={GEN_STRUCTURES.map((s) => ({ value: s.id, label: s.label }))}
                              selectSize="sm"
                            />
                          </Field>
                          <Field
                            label={
                              <>
                                <IconTarget size={11} stroke={1.9} /> Vùng mục tiêu
                              </>
                            }
                            hint={GEN_REGIONS.find((r) => r.id === genRegion)?.hint}
                          >
                            <Select
                              value={genRegion}
                              onChange={(e) => setGenRegion(e.target.value as GenRegion)}
                              options={GEN_REGIONS.map((r) => ({ value: r.id, label: r.label }))}
                              selectSize="sm"
                            />
                          </Field>
                          <Field
                            label={
                              <>
                                <IconMessageCircle size={11} stroke={1.9} /> Call-to-action
                              </>
                            }
                            hint={GEN_CTAS.find((c) => c.id === genCta)?.hint}
                          >
                            <Select
                              value={genCta}
                              onChange={(e) => setGenCta(e.target.value as GenCta)}
                              options={GEN_CTAS.map((c) => ({ value: c.id, label: c.label }))}
                              selectSize="sm"
                            />
                          </Field>
                          <Field
                            label={
                              <>
                                <IconPhoto size={11} stroke={1.9} /> Phong cách ảnh
                              </>
                            }
                            hint={GEN_IMAGE_STYLES.find((s) => s.id === genImageStyle)?.hint}
                          >
                            <Select
                              value={genImageStyle}
                              onChange={(e) => setGenImageStyle(e.target.value as GenImageStyle)}
                              options={GEN_IMAGE_STYLES.map((s) => ({ value: s.id, label: s.label }))}
                              selectSize="sm"
                            />
                          </Field>
                        </div>
                      </TabPanel>

                      <TabPanel value="advanced">
                        <div className="bga-ai-bar">
                          <IconBrain size={14} stroke={1.9} className="bga-ai-ic" />
                          <Select
                            value={genModel}
                            onChange={(e) => setGenModel(e.target.value)}
                            className="bga-ai-model"
                            selectSize="sm"
                            options={(Object.keys(AI_MODELS) as AiProvider[]).flatMap<SelectOption>((p) =>
                              AI_MODELS[p].map((m) => ({
                                value: `${p}|${m.id}`,
                                label: `${AI_PROVIDER_LABEL[p]} · ${m.label}${m.search ? " · web" : ""}${providers[p] ? "" : " (chưa có key)"}`,
                                disabled: !providers[p],
                              })),
                            )}
                          />
                        </div>

                        <div className="bga-toggles">
                          <label className="bga-toggle-card" title="Tra cứu web trước khi viết để có dữ kiện mới">
                            <Switch checked={genResearch} onChange={(e) => setGenResearch(e.target.checked)} />
                            <div className="bga-toggle-text">
                              <b>
                                <IconWorldSearch size={12} stroke={1.9} /> Tra cứu web
                              </b>
                              <span>Dữ kiện mới, kèm nguồn tham khảo trong bài</span>
                            </div>
                          </label>
                          <label className="bga-toggle-card" title="AI thứ hai rà lại bài, bỏ/làm mềm câu nghi bịa">
                            <Switch checked={genFactCheck} onChange={(e) => setGenFactCheck(e.target.checked)} />
                            <div className="bga-toggle-text">
                              <b>
                                <IconCircleCheckFilled size={12} /> Kiểm chứng dữ kiện
                              </b>
                              <span>Pass 2: AI bắt lỗi hallucination (chậm hơn ~15s)</span>
                            </div>
                          </label>
                          <label
                            className="bga-toggle-card"
                            title="Chèn mục Đọc thêm với 2-4 bài đã xuất bản liên quan"
                          >
                            <Switch
                              checked={genInternalLinks}
                              onChange={(e) => setGenInternalLinks(e.target.checked)}
                            />
                            <div className="bga-toggle-text">
                              <b>
                                <IconLink size={12} stroke={1.9} /> Liên kết nội bộ
                              </b>
                              <span>Chèn &quot;Đọc thêm&quot; đến bài liên quan — tốt cho SEO</span>
                            </div>
                          </label>
                        </div>
                      </TabPanel>
                    </Tabs>
                  </fieldset>

                  {genErr && !genLoading && Object.keys(genSteps).length === 0 && (
                    <div className="fx-err" style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <IconAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {genErr}
                    </div>
                  )}
                  <p className="bga-hint">
                    AI: <b>Groq · Gemini · OpenRouter · DeepSeek · Mistral · Cerebras · Pollinations</b> (tự fallback
                    khi hết lượt). Ảnh: <b>Unsplash · Pexels · Wikimedia · Openverse</b>. Bài vào trạng thái <b>Nháp</b>{" "}
                    để bạn duyệt.
                  </p>
                </>
              )}
            </div>
            <div className="fx-modal-foot">
              {genLoading ? (
                <button
                  className="fx-btn fx-btn-danger"
                  onClick={cancelGenerate}
                  disabled={genAborted}
                  style={{ marginLeft: "auto" }}
                >
                  {genAborted ? (
                    <>
                      <IconLoader2 size={14} className="spin" /> Đang huỷ…
                    </>
                  ) : (
                    <>
                      <IconX size={14} stroke={2} /> Huỷ sinh bài
                    </>
                  )}
                </button>
              ) : Object.keys(genSteps).length > 0 && (genAborted || genErr) ? (
                <button
                  className="fx-btn fx-btn-primary"
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    setGenSteps({});
                    setGenErr("");
                    setGenAborted(false);
                  }}
                >
                  <IconSparkles size={14} /> Thử lại
                </button>
              ) : (
                <>
                  <button className="fx-btn" onClick={() => setGenerateOpen(false)}>
                    Huỷ
                  </button>
                  <button
                    className="fx-btn fx-btn-primary"
                    onClick={generate}
                    disabled={genMode === "topic" && !topic.trim()}
                  >
                    <IconSparkles size={14} /> Sinh bài
                  </button>
                </>
              )}
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
            <div
              className={`fx-modal-body bga-edit${editView === "preview" ? " is-preview" : ""}`}
              style={{ maxHeight: "calc(94vh - 130px)" }}
            >
              <div className="bga-edit-side">
                <div className="bga-cover">
                  {editing.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={rewriteImgUrl(editing.coverImage.split("#")[0])} alt="" referrerPolicy="no-referrer" />
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
                          query: photoQuery(
                            editing.title,
                            editing.tags.split(",").map((s) => s.trim()),
                          ),
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
                <Field
                  required
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, width: "100%" }}>
                      Title
                      <button
                        type="button"
                        className="bga-inline-ai"
                        onClick={() => assist("meta")}
                        disabled={!!assisting}
                        title="AI gợi ý tiêu đề, mô tả, tags từ nội dung"
                        style={{ marginLeft: "auto" }}
                      >
                        {assisting === "meta" ? <IconLoader2 size={12} className="spin" /> : <IconSparkles size={12} />}{" "}
                        AI gợi ý
                      </button>
                    </span>
                  }
                >
                  <Input
                    value={editing.title}
                    onChange={(e) => setEditing((cur) => (cur ? { ...cur, title: e.target.value } : cur))}
                  />
                </Field>
                <Field label="Excerpt">
                  <Textarea
                    rows={3}
                    value={editing.excerpt}
                    onChange={(e) => setEditing((cur) => (cur ? { ...cur, excerpt: e.target.value } : cur))}
                  />
                </Field>
                <div className="bga-grid2">
                  <Field label="Category">
                    <Select
                      value={editing.category}
                      onChange={(e) =>
                        setEditing((cur) => (cur ? { ...cur, category: e.target.value as BlogCategory } : cur))
                      }
                      options={CAT_ORDER.map((c) => ({ value: c, label: CAT_LABEL[c] || c }))}
                    />
                  </Field>
                  <Field label="Phút đọc">
                    <Input
                      type="number"
                      value={editing.readMin}
                      onChange={(e) => setEditing((cur) => (cur ? { ...cur, readMin: Number(e.target.value) } : cur))}
                    />
                  </Field>
                </div>
                <Field label="Tags (phẩy phân cách)">
                  <Input
                    value={editing.tags}
                    onChange={(e) => setEditing((cur) => (cur ? { ...cur, tags: e.target.value } : cur))}
                  />
                </Field>
                <Field label="Slug">
                  <Input value={editing.slug} disabled monospace />
                </Field>
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
                  {editing.status === "published" ? (
                    <span className="bga-toolbar-label" style={{ color: "var(--warn, #f59e0b)" }}>
                      <IconEye size={13} /> Đang xem bài đã phát hành — chuyển về Nháp để chỉnh sửa
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="fx-btn"
                        disabled={editView !== "write"}
                        onClick={() =>
                          setPicker({
                            target: "inline",
                            query: photoQuery(
                              editing.title,
                              editing.tags.split(",").map((s) => s.trim()),
                            ),
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
                    </>
                  )}
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
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(editing.markdown.replace(/https?\\?:\/\/[^\s)"']+/g, (url) => rewriteImgUrl(url))) as string,
                    }}
                  />
                )}
              </div>
              {editErr && (
                <div className="fx-err" style={{ gridColumn: "1 / -1" }}>
                  {editErr}
                </div>
              )}
            </div>
            <div className="fx-modal-foot">
              <Link href={`/blog/${editing.slug}`} target="_blank" className="fx-btn" style={{ marginRight: "auto" }}>
                <IconExternalLink size={14} /> Xem bài
              </Link>
              {editing.status === "published" ? (
                <>
                  <button
                    type="button"
                    className="fx-btn"
                    onClick={async () => {
                      const p = posts.find((x) => x.slug === editing.slug);
                      if (!p) return;
                      await unpublish(p);
                      setEditing((cur) => (cur ? { ...cur, status: "draft" } : cur));
                    }}
                    disabled={saving}
                    title="Chuyển về nháp để chỉnh sửa"
                  >
                    <IconX size={14} /> Về Nháp để sửa
                  </button>
                  <button className="fx-btn fx-btn-primary" onClick={() => setEditing(null)}>
                    Đóng
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="fx-btn"
                    onClick={() => {
                      const p = posts.find((x) => x.slug === editing.slug);
                      if (p) reimage(p);
                    }}
                    disabled={saving || reimaging === editing.slug}
                    title="AI chọn lại ảnh liên quan trong bài (không đổi ảnh bìa)"
                  >
                    {reimaging === editing.slug ? (
                      <IconLoader2 size={14} className="spin" />
                    ) : (
                      <IconPhotoSearch size={14} />
                    )}{" "}
                    AI chọn lại ảnh
                  </button>
                  <button
                    type="button"
                    className="fx-btn fx-btn-danger"
                    onClick={async () => {
                      const p = posts.find((x) => x.slug === editing.slug);
                      if (!p) return;
                      await remove(p);
                      setEditing(null);
                    }}
                    disabled={saving}
                  >
                    <IconTrash size={14} /> Xoá
                  </button>
                  {editing.status === "draft" && (
                    <button
                      type="button"
                      className="fx-btn"
                      onClick={async () => {
                        const p = posts.find((x) => x.slug === editing.slug);
                        if (!p) return;
                        await reject(p);
                        setEditing(null);
                      }}
                      disabled={saving}
                      style={{ color: "var(--warn, #f59e0b)" }}
                    >
                      <IconX size={14} /> Từ chối
                    </button>
                  )}
                  {(editing.status === "draft" || editing.status === "rejected") && (
                    <button
                      type="button"
                      className="fx-btn"
                      onClick={async () => {
                        const p = posts.find((x) => x.slug === editing.slug);
                        if (!p) return;
                        await approve(p);
                        setEditing((cur) => (cur ? { ...cur, status: "published" } : cur));
                      }}
                      disabled={saving}
                      style={{ color: "var(--ok, #10b981)" }}
                    >
                      <IconCheck size={14} /> Duyệt
                    </button>
                  )}
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
                </>
              )}
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
              <Field label="Tên hiển thị" required>
                <Input
                  autoFocus
                  value={catEditing.label}
                  disabled={catSaving}
                  onChange={(e) => setCatEditing((cur) => (cur ? { ...cur, label: e.target.value } : cur))}
                  placeholder="VD: Món ăn Việt"
                />
              </Field>
              <div className="bga-grid2">
                <Field label={`Slug ${catEditing.isNew ? "" : "(cố định)"}`}>
                  <Input
                    value={catEditing.slug}
                    disabled={catSaving || !catEditing.isNew}
                    monospace
                    onChange={(e) => setCatEditing((cur) => (cur ? { ...cur, slug: e.target.value } : cur))}
                    placeholder="auto từ tên"
                  />
                </Field>
                <Field label="Thứ tự">
                  <Input
                    type="number"
                    value={catEditing.sort}
                    disabled={catSaving}
                    onChange={(e) =>
                      setCatEditing((cur) => (cur ? { ...cur, sort: Number(e.target.value) || 0 } : cur))
                    }
                  />
                </Field>
              </div>
              <Field label="Hiển thị công khai">
                <div className="bga-switch-row">
                  <Switch
                    checked={catEditing.active}
                    disabled={catSaving}
                    onChange={(e) => setCatEditing((cur) => (cur ? { ...cur, active: e.target.checked } : cur))}
                  />
                  <span className="bga-switch-lbl">{catEditing.active ? "Bật" : "Tắt"}</span>
                </div>
              </Field>
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
            justify-contentimport { size } from '../../apple-icon';
: flex-end;
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
