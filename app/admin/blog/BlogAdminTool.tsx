"use client";
import "@/app/blog/blog.css";
import { useToast } from "@/components/Toast";
import type { SelectOption } from "@/components/ui";
import { Field, Input, Select, Switch, Tab, TabPanel, Tabs, TabsList, Textarea } from "@/components/ui";
import {
  rewriteImgUrl,
  type BlogCategory,
  type BlogCategoryRow,
  type BlogPost,
  type BlogStatus,
  type DidYouKnowImage,
  type DidYouKnowItem,
} from "@/lib/blog";
import {
  AI_MODELS,
  AI_PROVIDER_LABEL,
  GEN_AUDIENCES,
  GEN_CTAS,
  GEN_IMAGE_STYLES,
  GEN_LENGTHS,
  GEN_REGIONS,
  GEN_STRUCTURES,
  GEN_TONES,
  pickModelForStructure,
  type AiPreference,
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
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconArrowsLeftRight,
  IconArticle,
  IconBook,
  IconBrain,
  IconBulb,
  IconCategory,
  IconChartBar,
  IconCheck,
  IconChevronDown,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconCircleDashedCheck,
  IconClock,
  IconDeviceFloppy,
  IconEdit,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconGripVertical,
  IconLayoutGrid,
  IconLayoutList,
  IconLink,
  IconListNumbers,
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
  IconShieldCheck,
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
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminBody from "../AdminBody";
import "./blog-admin.css";
import ImagePicker from "./ImagePicker";
import ImagesManager from "./ImagesManager";
import ManualComposer from "./ManualComposer";
import RelatedToolsPicker from "./RelatedToolsPicker";

marked.setOptions({ gfm: true, breaks: false });

type Props = {
  initialPosts: BlogPost[];
  initialCategories: BlogCategoryRow[];
  initialDidYouKnow?: DidYouKnowItem[];
  providers: Record<AiProvider, boolean>;
  isSuperAdmin?: boolean;
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

export default function BlogAdminTool({
  initialPosts,
  initialCategories,
  initialDidYouKnow,
  providers,
  isSuperAdmin = false,
}: Props) {
  const toast = useToast();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [cats, setCats] = useState<BlogCategoryRow[]>(initialCategories);
  const [dyk, setDyk] = useState<DidYouKnowItem[]>(initialDidYouKnow || []);
  const [q, setQ] = useState("");
  const [pinPickerOpen, setPinPickerOpen] = useState(false);
  const [pinPickerQ, setPinPickerQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tab, setTab] = useState<"posts" | "categories" | "knowledge" | "images">("posts");

  type DykDraft = {
    original?: string;
    slug: string;
    tag_vi: string;
    tag_en: string;
    title_vi: string;
    title_en: string;
    intro_vi: string;
    intro_en: string;
    images: DidYouKnowImage[];
    sort: number;
    active: boolean;
    isNew: boolean;
  };
  const [dykEditing, setDykEditing] = useState<DykDraft | null>(null);
  const [dykSaving, setDykSaving] = useState(false);
  const [dykErr, setDykErr] = useState("");
  const [dykChooserOpen, setDykChooserOpen] = useState(false);
  const [dykAiOpen, setDykAiOpen] = useState(false);
  const [dykAiTopic, setDykAiTopic] = useState("");
  const [dykAiCount, setDykAiCount] = useState(6);
  const [dykAiLoading, setDykAiLoading] = useState(false);
  const [dykAiErr, setDykAiErr] = useState("");

  async function generateDykAi() {
    setDykAiLoading(true);
    setDykAiErr("");
    try {
      const r = await fetch("/api/blog/did-you-know/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: dykAiTopic.trim(), provider: genProvider, count: dykAiCount }),
      });
      const j = await r.json();
      if (!r.ok) {
        setDykAiErr(j?.error || `Lỗi ${r.status}`);
        return;
      }
      await reloadDyk();
      toast(`Đã sinh: ${j.item?.title_vi || "mục mới"}`);
      setDykAiOpen(false);
      setDykAiTopic("");
    } catch (e: any) {
      setDykAiErr(e?.message || "Lỗi");
    } finally {
      setDykAiLoading(false);
    }
  }

  function openNewDyk() {
    setDykEditing({
      slug: "",
      tag_vi: "",
      tag_en: "",
      title_vi: "",
      title_en: "",
      intro_vi: "",
      intro_en: "",
      images: [],
      sort: (dyk.at(-1)?.sort ?? 0) + 10,
      active: true,
      isNew: true,
    });
    setDykErr("");
  }
  function openEditDyk(it: DidYouKnowItem) {
    setDykEditing({ original: it.slug, ...it, isNew: false });
    setDykErr("");
  }
  async function reloadDyk() {
    try {
      const r = await fetch("/api/blog/did-you-know");
      const j = await r.json();
      if (r.ok && Array.isArray(j.items)) setDyk(j.items);
    } catch {}
  }
  async function saveDyk() {
    if (!dykEditing) return;
    const title_vi = dykEditing.title_vi.trim();
    if (!title_vi) {
      setDykErr("Thiếu tiêu đề VI");
      return;
    }
    setDykSaving(true);
    setDykErr("");
    try {
      if (dykEditing.isNew) {
        const r = await fetch("/api/blog/did-you-know", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...dykEditing, title_vi }),
        });
        const j = await r.json();
        if (!r.ok) {
          setDykErr(j?.error || `Lỗi ${r.status}`);
          return;
        }
      } else {
        const r = await fetch("/api/blog/did-you-know", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...dykEditing, slug: dykEditing.original, title_vi }),
        });
        const j = await r.json();
        if (!r.ok) {
          setDykErr(j?.error || `Lỗi ${r.status}`);
          return;
        }
      }
      await reloadDyk();
      toast(`Đã lưu: ${title_vi}`);
      setDykEditing(null);
    } catch (e: any) {
      setDykErr(e?.message || "Lỗi");
    } finally {
      setDykSaving(false);
    }
  }
  async function toggleDykActive(it: DidYouKnowItem) {
    const r = await fetch("/api/blog/did-you-know", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: it.slug, active: !it.active }),
    });
    const j = await r.json();
    if (!r.ok) return toast(j?.error || "Lỗi");
    setDyk((prev) => prev.map((x) => (x.slug === it.slug ? { ...x, active: !it.active } : x)));
    toast(`${!it.active ? "Bật" : "Tắt"}: ${it.title_vi}`);
  }
  async function removeDyk(it: DidYouKnowItem) {
    if (!confirm(`Xoá "${it.title_vi}"?`)) return;
    const r = await fetch(`/api/blog/did-you-know?slug=${encodeURIComponent(it.slug)}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) return toast(j?.error || "Xoá thất bại");
    setDyk((prev) => prev.filter((x) => x.slug !== it.slug));
    toast(`Đã xoá: ${it.title_vi}`);
  }
  const [catDragIdx, setCatDragIdx] = useState<number | null>(null);
  const [catDropIdx, setCatDropIdx] = useState<number | null>(null);

  async function handleCatDrop() {
    if (catDragIdx === null || catDropIdx === null || catDragIdx === catDropIdx) {
      setCatDragIdx(null);
      setCatDropIdx(null);
      return;
    }
    const next = [...cats];
    const [moved] = next.splice(catDragIdx, 1);
    next.splice(catDropIdx, 0, moved);
    const reindexed = next.map((c, i) => ({ ...c, sort: (i + 1) * 10 }));
    setCats(reindexed);
    setCatDragIdx(null);
    setCatDropIdx(null);
    await Promise.all(
      reindexed.map((c) =>
        fetch("/api/blog/categories", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug: c.slug, sort: c.sort }),
        }),
      ),
    );
  }

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
  const [manualOpen, setManualOpen] = useState(false);
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
  const [genFactCheck, setGenFactCheck] = useState(true);
  const [genInternalLinks, setGenInternalLinks] = useState(true);
  const [genAutoAi, setGenAutoAi] = useState(true);
  const [genAiPref, setGenAiPref] = useState<AiPreference>("balanced");
  const [genPreset, setGenPreset] = useState<string>("");
  const [genTab, setGenTab] = useState("info");

  // SEO
  const [genLsi, setGenLsi] = useState("");
  const [genMetaDesc, setGenMetaDesc] = useState(true);
  const [genSchemaHint, setGenSchemaHint] = useState(true);
  const [genRelatedTools, setGenRelatedTools] = useState<string[]>([]);

  // Advanced style
  const [genHumanize, setGenHumanize] = useState(true);
  const [genCreativity, setGenCreativity] = useState<"safe" | "balanced" | "creative">("balanced");
  const [genEEAT, setGenEEAT] = useState(true);
  const [genOriginality, setGenOriginality] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleCollapsed = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  // Auto-pick model theo structure + preference khi genAutoAi bật.
  const applyAutoAi = (structure: GenStructure, pref: AiPreference = genAiPref) => {
    const picked = pickModelForStructure(structure, providers, pref);
    if (picked) setGenModel(`${picked.provider}|${picked.modelId}`);
  };
  const [topic, setTopic] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genErr, setGenErr] = useState("");
  const [genSteps, setGenSteps] = useState<Partial<Record<GenStep, StepState>>>({});
  const [genElapsed, setGenElapsed] = useState(0);
  const [genAborted, setGenAborted] = useState(false);
  const genAbortRef = useRef<AbortController | null>(null);
  const [ideas, setIdeas] = useState<{ title: string; angle: string }[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const ideasAbortRef = useRef<AbortController | null>(null);
  const [selectedIdeas, setSelectedIdeas] = useState<Record<string, string>>({}); // title -> angle
  const [batchIdx, setBatchIdx] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchFailed, setBatchFailed] = useState<{ title: string; angle: string; error: string }[]>([]);
  const batchAbortRef = useRef(false);
  // Khi người dùng bấm "Huỷ sinh bài", ta muốn quay lại form tuỳ chọn thay vì
  // đứng lại ở màn tiến trình "Đã huỷ" — cờ này báo cho các nhánh async biết.
  const userCancelRef = useRef(false);
  const lastGenErrRef = useRef("");
  const selectedCount = Object.keys(selectedIdeas).length;

  useEffect(() => {
    if (!genLoading) return;
    const t0 = Date.now();
    setGenElapsed(0);
    const id = setInterval(() => setGenElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [genLoading]);

  // Image picker + AI assist in the editor
  const [picker, setPicker] = useState<
    | null
    | { target: "cover" | "inline"; query: string }
    | { target: "replace"; query: string; replaceUrl: string }
  >(null);
  const [assisting, setAssisting] = useState<string | null>(null);
  const [editView, setEditView] = useState<"write" | "preview">("write");
  const mdRef = useRef<HTMLTextAreaElement>(null);
  const [reimageList, setReimageList] = useState<null | Array<{ url: string; alt: string }>>(null);

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
    relatedTools: string[];
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
    userCancelRef.current = true;
    batchAbortRef.current = true;
    genAbortRef.current?.abort();
    // Quay về form tuỳ chọn ngay thay vì giữ lại màn tiến trình "Đã huỷ".
    setGenLoading(false);
    setGenAborted(false);
    setGenSteps({});
    setGenErr("");
    setBatchFailed([]);
    lastGenErrRef.current = "";
  }

  async function generate(override?: { topic?: string; notes?: string }) {
    const t = (override?.topic ?? topic).trim();
    const seoBits: string[] = [];
    if (genLsi.trim()) seoBits.push(`LSI/related keywords: ${genLsi.trim()}`);
    if (genMetaDesc) seoBits.push("Chèn meta description 150-160 ký tự tối ưu CTR ở đầu phần tóm tắt.");
    if (genSchemaHint) seoBits.push("Bố cục theo schema.org tương ứng (H2/H3 rõ ràng, FAQ dùng câu hỏi/đáp án).");

    const styleBits: string[] = [];
    if (genHumanize)
      styleBits.push("Giảm 'AI tells': tránh cụm sáo, chuyển tiếp máy móc; câu đa dạng, giọng tự nhiên.");
    styleBits.push(
      `Mức sáng tạo: ${{ safe: "an toàn, bám sát nguồn", balanced: "cân bằng, có góc nhìn riêng", creative: "sáng tạo, nhiều liên tưởng" }[genCreativity]}`,
    );
    if (genEEAT)
      styleBits.push(
        "Tăng E-E-A-T: trích dẫn nguồn uy tín, nêu kinh nghiệm thực chiến khi phù hợp, tránh khẳng định không có bằng chứng.",
      );
    if (genOriginality) styleBits.push("Ưu tiên nguyên bản: không copy nguyên văn nguồn, diễn giải và tổng hợp.");

    const base = (override?.notes ?? genNotes).trim();
    const noteStr = [
      base,
      seoBits.length ? `[SEO] ${seoBits.join(" ")}` : "",
      styleBits.length ? `[STYLE] ${styleBits.join(" ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const useRandom = !t;
    const ac = new AbortController();
    genAbortRef.current = ac;
    userCancelRef.current = false;
    setGenAborted(false);
    setGenLoading(true);
    setGenErr("");
    lastGenErrRef.current = "";
    setGenSteps({
      ...(useRandom ? { topic: { status: "pending" } } : {}),
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
          mode: useRandom ? "random" : "topic",
          provider: genProvider,
          model: genModel.split("|")[1],
          topic: useRandom ? undefined : t,
          category: genCategory,
          tone: genTone,
          length: genLength,
          images: genImages,
          research: genResearch,
          notes: noteStr,
          audience: genAudience,
          structure: genStructure,
          seoKeyword: genSeoKeyword,
          extras: genExtras,
          cta: genCta,
          region: genRegion,
          imageStyle: genImageStyle,
          factCheck: genFactCheck,
          internalLinks: genInternalLinks,
          relatedTools: genRelatedTools,
        }),
      });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => null);
        const msg = j?.error || `Lỗi ${r.status}`;
        setGenErr(msg);
        lastGenErrRef.current = msg;
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
        else if (e.type === "error") {
          setGenErr(e.error);
          lastGenErrRef.current = e.error;
        } else if (e.type === "done") created = e.post;
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
        // Đồng bộ danh sách từ server để tab Nháp hiện bài mới mà không cần reload.
        router.refresh();
        if (!override) {
          setTopic("");
          setGenNotes("");
          setIdeas([]);
          setGenerateOpen(false);
        }
        toast(`Đã sinh: ${post.title}`);
        return post;
      }
    } catch (e: any) {
      if (ac.signal.aborted) {
        // Người dùng chủ động huỷ: cancelGenerate() đã đưa về form, không hiện lỗi.
        if (userCancelRef.current) {
          lastGenErrRef.current = "Đã huỷ sinh bài";
          return null;
        }
        setGenErr("Đã huỷ sinh bài");
        lastGenErrRef.current = "Đã huỷ sinh bài";
      } else {
        const msg = String(e?.message || e || "");
        const final = /fetch failed|network|aborted/i.test(msg)
          ? "Kết nối bị gián đoạn — có thể do mạng hoặc server quá tải. Hãy thử lại."
          : msg || "Lỗi không xác định";
        setGenErr(final);
        lastGenErrRef.current = final;
      }
    } finally {
      setGenLoading(false);
      genAbortRef.current = null;
    }
    return null;
  }

  async function generateBatch(itemsOverride?: { title: string; angle: string }[]) {
    const items = itemsOverride || Object.entries(selectedIdeas).map(([title, angle]) => ({ title, angle }));
    if (!items.length) return;
    batchAbortRef.current = false;
    setBatchRunning(true);
    setBatchTotal(items.length);
    setBatchFailed([]);
    let ok = 0;
    const failed: { title: string; angle: string; error: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      if (batchAbortRef.current) {
        // Bài còn lại sau khi huỷ cũng coi là chưa xong — giữ nguyên để người dùng thử lại.
        for (let j = i; j < items.length; j++) failed.push({ ...items[j], error: "Đã huỷ" });
        break;
      }
      setBatchIdx(i + 1);
      setGenSteps({});
      setGenErr("");
      setGenAborted(false);
      let r: BlogPost | null = null;
      try {
        r = (await generate({ topic: items[i].title, notes: items[i].angle })) || null;
      } catch (e: any) {
        r = null;
      }
      if (r) ok++;
      else failed.push({ ...items[i], error: lastGenErrRef.current || "Lỗi không xác định" });
      // Short gap between runs to let rate limits breathe.
      if (i < items.length - 1 && !batchAbortRef.current) await new Promise((res) => setTimeout(res, 800));
    }
    setBatchRunning(false);
    setBatchTotal(0);
    setBatchIdx(0);
    // Người dùng chủ động huỷ: đã quay về form tuỳ chọn, không hiện danh sách lỗi.
    if (userCancelRef.current) {
      setBatchFailed([]);
      setGenSteps({});
      setGenErr("");
      setGenAborted(false);
      return;
    }
    setBatchFailed(failed);
    if (failed.length === 0) {
      setSelectedIdeas({});
      setIdeas([]);
      setTopic("");
      setGenNotes("");
      setGenerateOpen(false);
    }
    toast(`Đã sinh ${ok}/${items.length} bài${failed.length ? ` · ${failed.length} lỗi` : ""}`);
  }

  const ideasPrevRef = useRef<{ ideas: typeof ideas; selected: typeof selectedIdeas } | null>(null);

  function cancelSuggestIdeas() {
    ideasAbortRef.current?.abort();
    ideasAbortRef.current = null;
    // Restore the snapshot taken before the aborted call.
    const prev = ideasPrevRef.current;
    if (prev) {
      setIdeas(prev.ideas);
      setSelectedIdeas(prev.selected);
      ideasPrevRef.current = null;
    }
    setIdeasLoading(false);
  }

  async function suggestIdeas(reroll = false) {
    ideasAbortRef.current?.abort();
    const ac = new AbortController();
    ideasAbortRef.current = ac;
    const existingTitles = posts.map((p) => p.title);
    const exclude = reroll ? [...existingTitles, ...ideas.map((i) => i.title)] : existingTitles;
    // Snapshot current state so cancel can restore it.
    ideasPrevRef.current = { ideas, selected: selectedIdeas };
    // Clear old data up front so the panel does not look stale while loading.
    setIdeas([]);
    if (reroll) setSelectedIdeas({});
    setIdeasLoading(true);
    setGenErr("");
    try {
      const r = await fetch("/api/blog/ideas", {
        method: "POST",
        signal: ac.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: genCategory,
          provider: genProvider,
          trending: true,
          exclude,
          topic: topic.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) return setGenErr(j?.error || `Lỗi ${r.status}`);
      setIdeas(j.ideas || []);
      ideasPrevRef.current = null;
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setGenErr(e?.message || "Lỗi");
    } finally {
      if (ideasAbortRef.current === ac) {
        ideasAbortRef.current = null;
        setIdeasLoading(false);
      }
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

  function openReimageList() {
    if (!editing) return;
    const md = editing.markdown;
    const re = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
    const seen = new Set<string>();
    const items: Array<{ url: string; alt: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(md))) {
      const url = m[2];
      if (seen.has(url)) continue;
      seen.add(url);
      items.push({ alt: m[1], url });
    }
    if (!items.length) {
      toast("Bài chưa có ảnh để chọn lại");
      return;
    }
    setReimageList(items);
  }

  function pickImage(c: ImageCandidate) {
    if (!picker || !editing) return;
    const src = c.source === "unsplash" ? "Unsplash" : c.license ? `${c.license} · Openverse` : "Openverse";
    if (picker.target === "cover") {
      const credit = encodeURIComponent(JSON.stringify({ name: c.credit, url: c.creditUrl, source: src }));
      setEditing((cur) => (cur ? { ...cur, coverImage: `${c.url}#credit=${credit}` } : cur));
    } else if (picker.target === "replace") {
      const md = editing.markdown;
      const oldUrl = picker.replaceUrl;
      const escaped = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)(\\n\\*Ảnh:[^\\n]*\\*)?`, "g");
      const alt = (c.alt.split(" · ")[0] || editing.title).replace(/[[\]]/g, "");
      const snippet = `![${alt}](${c.url})\n*Ảnh: [${c.credit.replace(/[[\]]/g, "")}](${c.creditUrl}) / ${src}*`;
      setEditing((cur) => (cur ? { ...cur, markdown: md.replace(re, snippet) } : cur));
      toast("Đã thay ảnh");
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
        relatedTools: Array.isArray(j.post.relatedTools) ? j.post.relatedTools : [],
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
          relatedTools: editing.relatedTools,
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
      headerActions={null}
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
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
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
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setTab("knowledge")}
              className={`fx-btn ${tab === "knowledge" ? "fx-btn-primary" : "fx-btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              <IconBulb size={13} stroke={1.9} /> Kiến thức
            </button>
          )}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setTab("images")}
              className={`fx-btn ${tab === "images" ? "fx-btn-primary" : "fx-btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              <IconPhoto size={13} stroke={1.9} /> Hình ảnh
            </button>
          )}
        </div>
        {tab === "posts" ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setManualOpen(true)} className={isSuperAdmin ? "fx-btn" : "fx-btn fx-btn-primary"}>
              <IconWriting size={14} stroke={2.2} /> Soạn thủ công
            </button>
            {isSuperAdmin && (
              <button onClick={() => setGenerateOpen(true)} className="fx-btn fx-btn-primary">
                <IconSparkles size={14} stroke={2.2} /> Sinh bài AI
              </button>
            )}
          </div>
        ) : tab === "categories" ? (
          <button onClick={openNewCategory} className="fx-btn fx-btn-primary">
            <IconPlus size={14} stroke={2.2} /> Thêm danh mục
          </button>
        ) : tab === "knowledge" ? (
          <button onClick={() => setDykChooserOpen(true)} className="fx-btn fx-btn-primary">
            <IconPlus size={14} stroke={2.2} /> Thêm kiến thức
          </button>
        ) : null}
      </div>

      {tab === "images" ? (
        isSuperAdmin ? (
          <ImagesManager />
        ) : null
      ) : tab === "knowledge" && isSuperAdmin ? (
        dyk.length === 0 ? (
          <div className="fx-empty">
            <div className="fx-empty-ico">
              <IconBulb size={22} stroke={1.7} />
            </div>
            Chưa có kiến thức nào. Bấm &quot;Thêm kiến thức&quot; để tạo mới.
          </div>
        ) : (
          <div className="fx-table">
            <div className="fx-row fx-row-head" style={{ gridTemplateColumns: "56px 1fr 140px 80px 80px 140px" }}>
              <div />
              <div>Tiêu đề</div>
              <div>Tag</div>
              <div style={{ textAlign: "center" }}>Ảnh</div>
              <div style={{ textAlign: "center" }}>Thứ tự</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>
            {dyk.map((it) => (
              <div
                key={it.slug}
                className="fx-row"
                style={{ gridTemplateColumns: "56px 1fr 140px 80px 80px 140px", opacity: it.active ? 1 : 0.55 }}
              >
                <div className="bga-thumb">
                  {it.images[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={rewriteImgUrl(it.images[0].url)} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <span style={{ background: "linear-gradient(135deg,#64748b,#334155)" }} />
                  )}
                </div>
                <div className="fx-title-cell">
                  <div className="fx-t-row">
                    <b>{it.title_vi}</b>
                    {!it.active && (
                      <span className="fx-badge" data-tone="mute">
                        Tắt
                      </span>
                    )}
                  </div>
                  <span className="fx-t-sub">{it.intro_vi}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--dim)" }}>{it.tag_vi}</div>
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--dim)" }}>{it.images.length}</div>
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--dim)" }}>{it.sort}</div>
                <div className="fx-row-actions">
                  <button
                    className="fx-btn fx-btn-icon"
                    onClick={() => toggleDykActive(it)}
                    title={it.active ? "Tắt" : "Bật"}
                  >
                    {it.active ? <IconEye size={14} stroke={1.9} /> : <IconEyeOff size={14} stroke={1.9} />}
                  </button>
                  <button className="fx-btn fx-btn-icon" onClick={() => openEditDyk(it)} title="Sửa">
                    <IconEdit size={14} stroke={1.9} />
                  </button>
                  <button className="fx-btn fx-btn-icon fx-btn-danger" onClick={() => removeDyk(it)} title="Xoá">
                    <IconTrash size={14} stroke={1.9} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === "categories" ? (
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
            {cats.map((c, i) => {
              const n = posts.filter((p) => p.category === c.slug).length;
              const isDragging = catDragIdx === i;
              const isOver = catDropIdx === i && catDragIdx !== null && catDragIdx !== i;
              return (
                <div
                  key={c.slug}
                  className="fx-row"
                  draggable
                  onDragStart={() => setCatDragIdx(i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setCatDropIdx(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    void handleCatDrop();
                  }}
                  onDragEnd={() => {
                    setCatDragIdx(null);
                    setCatDropIdx(null);
                  }}
                  style={{
                    gridTemplateColumns: "32px 1fr 160px 80px 80px 140px",
                    opacity: isDragging ? 0.4 : c.active ? 1 : 0.55,
                    borderTop: isOver ? "2px solid var(--accent, #6366f1)" : undefined,
                  }}
                >
                  <div className="fx-icon-cell" style={{ cursor: "grab", color: "var(--dim)" }} title="Kéo để sắp xếp">
                    <IconGripVertical size={16} stroke={1.8} />
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
      ) : (
        <>
          {(() => {
            const pinned = posts.filter((x) => x.pinned);
            const canAdd = pinned.length < MAX_PINNED;
            const candidates = posts
              .filter((x) => !x.pinned && (x.status || "published") === "published")
              .filter((x) => {
                const s = pinPickerQ.trim().toLowerCase();
                if (!s) return true;
                return (
                  x.title.toLowerCase().includes(s) ||
                  x.slug.toLowerCase().includes(s) ||
                  (x.excerpt || "").toLowerCase().includes(s)
                );
              })
              .slice(0, 30);
            return (
              <div className="bga-pinned-strip">
                <div className="bga-pinned-head">
                  <IconPinFilled size={13} stroke={2} />
                  <span>
                    Đang ghim ({pinned.length}/{MAX_PINNED})
                  </span>
                  {canAdd && (
                    <button
                      type="button"
                      className="bga-pinned-add"
                      onClick={() => setPinPickerOpen((v) => !v)}
                      title="Chọn bài để ghim"
                    >
                      <IconPlus size={12} stroke={2.2} /> Chọn bài
                    </button>
                  )}
                </div>
                {pinPickerOpen && canAdd && (
                  <div className="bga-pinned-picker">
                    <input
                      type="text"
                      value={pinPickerQ}
                      onChange={(e) => setPinPickerQ(e.target.value)}
                      placeholder="Tìm theo tiêu đề, slug…"
                      className="bga-pinned-picker-input"
                      autoFocus
                    />
                    <div className="bga-pinned-picker-list">
                      {candidates.length === 0 ? (
                        <div className="bga-pinned-picker-empty">Không có bài phù hợp</div>
                      ) : (
                        candidates.map((p) => (
                          <button
                            key={p.slug}
                            type="button"
                            className="bga-pinned-picker-item"
                            onClick={async () => {
                              await togglePin(p);
                              setPinPickerQ("");
                            }}
                          >
                            <div className="bga-pinned-thumb">
                              {p.coverImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={rewriteImgUrl(
                                    p.coverImage
                                      .split("#")[0]
                                      .replace(/([?&])w=\d+/, "$1w=120")
                                      .replace(/([?&])h=\d+/, "$1h=80"),
                                  )}
                                  alt=""
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span
                                  style={{ background: `linear-gradient(135deg, ${p.cover.from}, ${p.cover.to})` }}
                                />
                              )}
                            </div>
                            <div className="bga-pinned-picker-text">
                              <b>{p.title}</b>
                              <span>/blog/{p.slug}</span>
                            </div>
                            <IconPin size={13} stroke={1.9} />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {pinned.length === 0 ? (
                  <div className="bga-pinned-empty">Chưa có bài nào được ghim. Bấm &quot;Chọn bài&quot; để thêm.</div>
                ) : (
                <div className="bga-pinned-list">
                  {pinned.map((p) => (
                    <div key={p.slug} className="bga-pinned-item">
                      <div className="bga-pinned-thumb">
                        {p.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={rewriteImgUrl(
                              p.coverImage
                                .split("#")[0]
                                .replace(/([?&])w=\d+/, "$1w=120")
                                .replace(/([?&])h=\d+/, "$1h=80"),
                            )}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span style={{ background: `linear-gradient(135deg, ${p.cover.from}, ${p.cover.to})` }} />
                        )}
                      </div>
                      <button
                        className="bga-pinned-title"
                        onClick={() => startEdit(p)}
                        title="Sửa"
                        type="button"
                      >
                        {p.title}
                      </button>
                      <button
                        className="fx-btn fx-btn-icon"
                        onClick={() => togglePin(p)}
                        title="Bỏ ghim"
                        style={{ color: "var(--warn, #f59e0b)" }}
                        type="button"
                      >
                        <IconPinFilled size={13} stroke={2} />
                      </button>
                    </div>
                  ))}
                </div>
                )}
              </div>
            );
          })()}
          {visible.length === 0 ? (
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
                    {isSuperAdmin && (status === "draft" || status === "rejected") && (
                      <button
                        className="fx-btn fx-btn-icon"
                        onClick={() => approve(p)}
                        title="Duyệt → DB"
                        style={{ color: "var(--ok, #10b981)" }}
                      >
                        <IconCheck size={14} stroke={2} />
                      </button>
                    )}
                    {isSuperAdmin && status === "draft" && (
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
                        {isSuperAdmin && (
                          <button
                            className="fx-btn fx-btn-icon"
                            onClick={() => unpublish(p)}
                            title="Về nháp để sửa"
                            style={{ color: "var(--info, #3b82f6)" }}
                          >
                            <IconRotateClockwise size={14} stroke={1.9} />
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </>
      )}

      {/* GENERATE MODAL */}
      <ManualComposer
        open={manualOpen}
        categories={cats}
        onClose={() => setManualOpen(false)}
        onSaved={() => {
          setManualOpen(false);
          router.refresh();
        }}
      />

      {isSuperAdmin && generateOpen && (
        <div className="fx-modal-bg" style={{ zIndex: 200 }}>
          <div className="fx-modal" style={{ maxWidth: 880, width: "96vw" }}>
            <div className="fx-modal-head">
              <h2>
                <IconSparkles size={16} stroke={2} /> Sinh bài blog
                <span className="fx-badge">AI</span>
              </h2>
              <button
                className="fx-btn fx-btn-icon fx-btn-ghost"
                onClick={() => !genLoading && !batchRunning && setGenerateOpen(false)}
                disabled={genLoading || batchRunning}
                title={genLoading || batchRunning ? "Đang sinh bài — không thể đóng" : "Đóng"}
              >
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
                    <div
                      className={`bga-progress-inline${genLoading ? " is-live" : ""}${genAborted ? " is-aborted" : ""}${genErr && !genAborted ? " is-error" : ""}`}
                    >
                      <div className="bga-prog-hero">
                        <div
                          className="bga-prog-ring"
                          style={{ ["--p" as string]: pct, ["--size" as string]: "92px" }}
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div className="bga-prog-ring-inner">
                            <span className="bga-prog-ring-pct">{pct}</span>
                            <span className="bga-prog-ring-unit">%</span>
                          </div>
                        </div>
                        <div className="bga-prog-hero-text">
                          <div className="bga-prog-stage">
                            {genLoading ? (
                              <>
                                <span className="bga-prog-dot" />
                                <span>{batchTotal > 1 ? `Bài ${batchIdx}/${batchTotal}` : "Đang sinh bài"}</span>
                              </>
                            ) : genAborted ? (
                              <>
                                <IconX size={12} stroke={2.2} /> <span>Đã huỷ</span>
                              </>
                            ) : (
                              <>
                                <IconAlertTriangle size={12} /> <span>Dừng với lỗi</span>
                              </>
                            )}
                          </div>
                          <div className="bga-prog-current">
                            {genLoading ? (
                              <>
                                <IconLoader2 size={16} className="spin" />
                                <span>{activeLabel || "Chuẩn bị…"}</span>
                              </>
                            ) : (
                              <span>
                                {done}/{total} bước hoàn tất
                              </span>
                            )}
                          </div>
                          <div className="bga-prog-meta-row">
                            <span className="bga-prog-chip">
                              <IconClock size={11} stroke={2} /> {genElapsed}s
                            </span>
                            <span className="bga-prog-chip">
                              {done}/{total} bước
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bga-progress-bar">
                        <div className="bga-progress-fill" style={{ width: `${pct}%` }} />
                      </div>

                      <ol className="bga-prog-grid">
                        {keys.map((k) => {
                          const st = genSteps[k]!;
                          const dur = st.durationMs;
                          return (
                            <li key={k} data-status={st.status} className="bga-prog-cell">
                              <span className="bga-prog-cell-ico">
                                {st.status === "done" ? (
                                  <IconCircleCheckFilled size={18} />
                                ) : st.status === "start" ? (
                                  <IconLoader2 size={18} className="spin" />
                                ) : st.status === "skip" ? (
                                  <IconPlayerSkipForward size={16} />
                                ) : (
                                  <IconCircleDashed size={18} />
                                )}
                              </span>
                              <div className="bga-prog-cell-body">
                                <div className="bga-prog-cell-top">
                                  <b>{STEP_LABEL[k]}</b>
                                  {dur != null && dur > 0 && (
                                    <span className="bga-prog-cell-dur">{(dur / 1000).toFixed(1)}s</span>
                                  )}
                                </div>
                                {st.detail && <span className="bga-prog-cell-detail">{st.detail}</span>}
                              </div>
                            </li>
                          );
                        })}
                      </ol>

                      {genErr && (
                        <div className="bga-prog-err">
                          <IconAlertTriangle size={14} /> <span>{genErr}</span>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <>
                  <fieldset disabled={genLoading} className="bga-gen4">
                    {/* HERO — unified topic input (empty → AI auto picks) */}
                    <div className="bga-topic-hero">
                      <Input
                        autoFocus
                        className="bga-topic-input"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" || genLoading) return;
                          if (!topic.trim() && selectedCount === 0) return;
                          generate();
                        }}
                        placeholder={`Chủ đề bài viết… (để trống → AI tự chọn cho ${CAT_LABEL[genCategory] || genCategory})`}
                        leftIcon={
                          topic.trim() ? (
                            <IconTarget size={16} stroke={1.9} />
                          ) : (
                            <IconSparkles size={16} stroke={2} className="bga-topic-ai-ic" />
                          )
                        }
                        rightSlot={
                          <div className="bga-topic-tools">
                            <button
                              type="button"
                              className="bga-tool-btn bga-tool-btn-primary"
                              onClick={() => suggestIdeas()}
                              disabled={ideasLoading}
                              title="Tra cứu web xu hướng mới, không trùng bài đã có"
                            >
                              {ideasLoading ? (
                                <IconLoader2 size={14} className="spin" />
                              ) : (
                                <IconWorldSearch size={14} />
                              )}
                              <span className="bga-tool-btn-lbl">Gợi ý</span>
                            </button>
                          </div>
                        }
                      />
                    </div>

                    {(ideasLoading || ideas.length > 0) && (
                      <div className={`bga-opt-card${collapsed.ideas ? " is-collapsed" : ""}`}>
                        <div className="bga-opt-card-head">
                          <span className="bga-opt-card-ic">
                            <IconBulb size={12} stroke={2} />
                          </span>
                          <b>Gợi ý chủ đề</b>
                          <span className="bga-opt-card-dim">
                            {ideasLoading
                              ? "Đang lấy gợi ý…"
                              : selectedCount > 0
                                ? `Đã chọn ${selectedCount}/${ideas.length}`
                                : "Chọn 1 hoặc nhiều để sinh hàng loạt"}
                          </span>
                          <button
                            type="button"
                            className="bga-opt-card-collapse"
                            onClick={() => toggleCollapsed("ideas")}
                            title={collapsed.ideas ? "Mở rộng" : "Thu gọn"}
                            aria-label={collapsed.ideas ? "Mở rộng" : "Thu gọn"}
                          >
                            <IconChevronDown size={13} stroke={2} />
                          </button>
                          <button
                            type="button"
                            className="bga-opt-card-close"
                            onClick={() => {
                              if (ideasLoading) cancelSuggestIdeas();
                              setIdeas([]);
                              setSelectedIdeas({});
                              ideasPrevRef.current = null;
                            }}
                            title="Đóng gợi ý chủ đề"
                            aria-label="Đóng gợi ý chủ đề"
                          >
                            <IconX size={13} stroke={2} />
                          </button>
                        </div>
                        <div className="bga-opt-card-body">
                          {ideasLoading ? (
                            <div className="bga-ideas bga-ideas-compact">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="bga-idea-skel" />
                              ))}
                            </div>
                          ) : (
                            <div className="bga-ideas bga-ideas-compact">
                              {ideas.map((i) => {
                                const on = i.title in selectedIdeas;
                                return (
                                  <button
                                    key={i.title}
                                    type="button"
                                    className={on ? "is-on" : ""}
                                    onClick={() => {
                                      setSelectedIdeas((prev) => {
                                        const next = { ...prev };
                                        if (on) delete next[i.title];
                                        else next[i.title] = i.angle || "";
                                        return next;
                                      });
                                    }}
                                  >
                                    <b>{i.title}</b>
                                    {i.angle && <span>{i.angle}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <div className="bga-ideas-foot">
                            <span className="bga-ideas-count">
                              {selectedCount > 0 && !ideasLoading ? (
                                <button type="button" className="bga-ideas-clear" onClick={() => setSelectedIdeas({})}>
                                  Bỏ chọn tất cả
                                </button>
                              ) : null}
                            </span>
                            {ideasLoading ? (
                              <button
                                type="button"
                                className="bga-ideas-reroll"
                                onClick={cancelSuggestIdeas}
                                title="Huỷ gọi API lấy gợi ý"
                              >
                                <IconX size={12} stroke={2} />
                                Huỷ
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="bga-ideas-reroll"
                                onClick={() => suggestIdeas(true)}
                                title="Lấy 6 gợi ý khác"
                              >
                                <IconRotateClockwise size={12} stroke={2} />
                                Đổi gợi ý khác
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TABS — Nội dung / Phong cách / SEO / Nâng cao */}
                    <Tabs value={genTab} onValueChange={setGenTab} variant="segment">
                      <TabsList>
                        <Tab value="info">
                          <IconArticle size={13} stroke={1.9} /> Thông tin
                        </Tab>
                        <Tab value="style">
                          <IconPalette size={13} stroke={1.9} /> Phong cách
                        </Tab>
                        <Tab value="seo">
                          <IconChartBar size={13} stroke={1.9} /> SEO
                        </Tab>
                        <Tab value="advanced">
                          <IconBrain size={13} stroke={1.9} /> Nâng cao
                        </Tab>
                        <Tab value="sources">
                          <IconLink size={13} stroke={1.9} /> Nguồn
                        </Tab>
                      </TabsList>

                      <TabPanel value="seo">
                        <div className={`bga-opt-card${collapsed.seoKw ? " is-collapsed" : ""}`}>
                          <div className="bga-opt-card-head">
                            <span className="bga-opt-card-ic">
                              <IconSearch size={12} stroke={2} />
                            </span>
                            <b>Từ khoá</b>
                            <span className="bga-opt-card-dim">Mục tiêu xếp hạng</span>
                            <button
                              type="button"
                              className="bga-opt-card-collapse"
                              onClick={() => toggleCollapsed("seoKw")}
                              title={collapsed.seoKw ? "Mở rộng" : "Thu gọn"}
                              aria-label="Thu gọn"
                            >
                              <IconChevronDown size={13} stroke={2} />
                            </button>
                          </div>
                          <div className="bga-opt-card-body">
                            <div className="bga-grid-dense">
                              <Field label="Từ khoá chính (focus keyword)">
                                <Input
                                  value={genSeoKeyword}
                                  onChange={(e) => setGenSeoKeyword(e.target.value)}
                                  placeholder="webgpu là gì…"
                                  inputSize="sm"
                                />
                              </Field>
                              <Field label="Từ khoá liên quan (LSI, cách bằng dấu phẩy)">
                                <Input
                                  value={genLsi}
                                  onChange={(e) => setGenLsi(e.target.value)}
                                  placeholder="webgl, three.js, canvas, gpu rendering"
                                  inputSize="sm"
                                />
                              </Field>
                            </div>
                          </div>
                        </div>

                        <div className={`bga-opt-card${collapsed.seoTech ? " is-collapsed" : ""}`}>
                          <div className="bga-opt-card-head">
                            <span className="bga-opt-card-ic">
                              <IconChartBar size={12} stroke={2} />
                            </span>
                            <b>Tối ưu kỹ thuật</b>
                            <span className="bga-opt-card-dim">Meta, schema & liên kết</span>
                            <button
                              type="button"
                              className="bga-opt-card-collapse"
                              onClick={() => toggleCollapsed("seoTech")}
                              title={collapsed.seoTech ? "Mở rộng" : "Thu gọn"}
                              aria-label="Thu gọn"
                            >
                              <IconChevronDown size={13} stroke={2} />
                            </button>
                          </div>
                          <div className="bga-opt-card-body">
                            <div className="bga-toggles">
                              <label className="bga-toggle-card" title="Chèn meta description 150-160 ký tự tối ưu CTR">
                                <Switch checked={genMetaDesc} onChange={(e) => setGenMetaDesc(e.target.checked)} />
                                <div className="bga-toggle-text">
                                  <b>
                                    <IconTextGrammar size={12} stroke={1.9} /> Meta description
                                  </b>
                                  <span>Mô tả 150-160 ký tự, chứa focus keyword, viral CTR</span>
                                </div>
                              </label>
                              <label
                                className="bga-toggle-card"
                                title="Bố cục khớp schema.org (FAQPage, HowTo, Article…)"
                              >
                                <Switch checked={genSchemaHint} onChange={(e) => setGenSchemaHint(e.target.checked)} />
                                <div className="bga-toggle-text">
                                  <b>
                                    <IconBook size={12} stroke={1.9} /> Schema-friendly
                                  </b>
                                  <span>H2/H3 rõ ràng, FAQ dạng Q/A — dễ snippet</span>
                                </div>
                              </label>
                              <label
                                className="bga-toggle-card"
                                title="Chèn mục Đọc thêm với bài đã xuất bản liên quan"
                              >
                                <Switch
                                  checked={genInternalLinks}
                                  onChange={(e) => setGenInternalLinks(e.target.checked)}
                                />
                                <div className="bga-toggle-text">
                                  <b>
                                    <IconLink size={12} stroke={1.9} /> Liên kết nội bộ
                                  </b>
                                  <span>Chèn &quot;Đọc thêm&quot; — tăng dwell time</span>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </TabPanel>

                      <TabPanel value="info">
                        <div className={`bga-opt-card${collapsed.tongquat ? " is-collapsed" : ""}`}>
                          <div className="bga-opt-card-head">
                            <span className="bga-opt-card-ic">
                              <IconSparkles size={12} stroke={2} />
                            </span>
                            <b>Tổng quát</b>
                            <span className="bga-opt-card-dim">Cơ bản, preset &amp; cấu hình bài</span>
                            <button
                              type="button"
                              className="bga-opt-card-collapse"
                              onClick={() => toggleCollapsed("tongquat")}
                              title={collapsed.tongquat ? "Mở rộng" : "Thu gọn"}
                              aria-label={collapsed.tongquat ? "Mở rộng" : "Thu gọn"}
                            >
                              <IconChevronDown size={13} stroke={2} />
                            </button>
                          </div>
                          <div className="bga-opt-card-body">
                            <div className="bga-presets" title="Preset nhanh — nạp sẵn phong cách & cấu trúc">
                              <span className="bga-presets-lbl">Preset:</span>
                              {(
                                [
                                  {
                                    id: "tutorial",
                                    label: "Hướng dẫn",
                                    ic: <IconWriting size={12} stroke={1.9} />,
                                    apply: () => {
                                      setGenTone("tutorial");
                                      setGenStructure("howto");
                                      setGenAudience("intermediate");
                                      setGenLength("long");
                                      setGenExtras(["tldr", "code", "checklist"]);
                                      setGenRegion("vn");
                                      setGenImageStyle("mixed");
                                      setGenCta("readmore");
                                      if (genAutoAi) applyAutoAi("howto");
                                    },
                                  },
                                  {
                                    id: "review",
                                    label: "Review",
                                    ic: <IconPalette size={12} stroke={1.9} />,
                                    apply: () => {
                                      setGenTone("analysis");
                                      setGenStructure("review");
                                      setGenAudience("mixed");
                                      setGenLength("medium");
                                      setGenExtras(["tldr", "faq", "takeaway"]);
                                      setGenRegion("vn");
                                      setGenImageStyle("photo");
                                      setGenCta("comment");
                                      if (genAutoAi) applyAutoAi("review");
                                    },
                                  },
                                  {
                                    id: "deepdive",
                                    label: "Phân tích sâu",
                                    ic: <IconBrain size={12} stroke={1.9} />,
                                    apply: () => {
                                      setGenTone("expert");
                                      setGenStructure("deepdive");
                                      setGenAudience("expert");
                                      setGenLength("long");
                                      setGenExtras(["stats", "takeaway", "glossary"]);
                                      setGenRegion("global");
                                      setGenImageStyle("illustration");
                                      setGenCta("readmore");
                                      if (genAutoAi) applyAutoAi("deepdive");
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
                                      setGenRegion("global");
                                      setGenImageStyle("photo");
                                      setGenCta("share");
                                      setGenResearch(true);
                                      if (genAutoAi) applyAutoAi("news");
                                    },
                                  },
                                  {
                                    id: "listicle",
                                    label: "Top N",
                                    ic: <IconListNumbers size={12} stroke={1.9} />,
                                    apply: () => {
                                      setGenTone("friendly");
                                      setGenStructure("listicle");
                                      setGenAudience("mixed");
                                      setGenLength("medium");
                                      setGenExtras(["tldr", "example"]);
                                      setGenRegion("vn");
                                      setGenImageStyle("mixed");
                                      setGenCta("share");
                                      if (genAutoAi) applyAutoAi("listicle");
                                    },
                                  },
                                  {
                                    id: "comparison",
                                    label: "So sánh",
                                    ic: <IconArrowsLeftRight size={12} stroke={1.9} />,
                                    apply: () => {
                                      setGenTone("analysis");
                                      setGenStructure("comparison");
                                      setGenAudience("intermediate");
                                      setGenLength("medium");
                                      setGenExtras(["tldr", "stats", "takeaway"]);
                                      setGenRegion("global");
                                      setGenImageStyle("mixed");
                                      setGenCta("comment");
                                      if (genAutoAi) applyAutoAi("comparison");
                                    },
                                  },
                                  {
                                    id: "explainer",
                                    label: "Giải thích",
                                    ic: <IconBulb size={12} stroke={1.9} />,
                                    apply: () => {
                                      setGenTone("friendly");
                                      setGenStructure("explainer");
                                      setGenAudience("beginner");
                                      setGenLength("medium");
                                      setGenExtras(["tldr", "glossary", "example"]);
                                      setGenRegion("vn");
                                      setGenImageStyle("illustration");
                                      setGenCta("readmore");
                                      if (genAutoAi) applyAutoAi("explainer");
                                    },
                                  },
                                  {
                                    id: "story",
                                    label: "Kể chuyện",
                                    ic: <IconMessageCircle size={12} stroke={1.9} />,
                                    apply: () => {
                                      setGenTone("story");
                                      setGenStructure("explainer");
                                      setGenAudience("mixed");
                                      setGenLength("medium");
                                      setGenExtras(["tldr", "quote"]);
                                      setGenRegion("vn");
                                      setGenImageStyle("photo");
                                      setGenCta("comment");
                                      if (genAutoAi) applyAutoAi("explainer");
                                    },
                                  },
                                  {
                                    id: "seo",
                                    label: "Chuẩn SEO",
                                    ic: <IconSearch size={12} stroke={1.9} />,
                                    apply: () => {
                                      setGenTone("expert");
                                      setGenStructure("auto");
                                      setGenAudience("mixed");
                                      setGenLength("medium");
                                      setGenExtras(["tldr", "faq", "takeaway"]);
                                      setGenRegion("vn");
                                      setGenImageStyle("mixed");
                                      setGenCta("newsletter");
                                      setGenInternalLinks(true);
                                      if (genAutoAi) applyAutoAi("auto");
                                    },
                                  },
                                ] as const
                              ).map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className={`bga-preset-btn${genPreset === p.id ? " is-on" : ""}`}
                                  onClick={() => {
                                    p.apply();
                                    setGenPreset(p.id);
                                  }}
                                  title={`Preset: ${p.label}`}
                                >
                                  {p.ic} {p.label}
                                </button>
                              ))}
                            </div>

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

                            <Field
                              label={
                                <>
                                  <IconMessageCircle size={11} stroke={1.9} /> Yêu cầu thêm (tuỳ chọn)
                                </>
                              }
                              hint="Brief riêng cho bài: ý bắt buộc có, ví dụ cần đưa vào, điều cần tránh…"
                            >
                              <Textarea
                                rows={1}
                                value={genNotes}
                                onChange={(e) => setGenNotes(e.target.value)}
                                placeholder="Ý bắt buộc có, ví dụ cần đưa vào, điều cần tránh…"
                              />
                            </Field>

                          </div>
                        </div>
                      </TabPanel>

                      <TabPanel value="sources">
                        <div className="bga-opt-card">
                          <div className="bga-opt-card-head">
                            <span className="bga-opt-card-ic">
                              <IconLink size={12} stroke={2} />
                            </span>
                            <b>Công cụ liên quan (tuỳ chọn)</b>
                            <span className="bga-opt-card-dim">Chèn block ở cuối bài</span>
                          </div>
                          <div className="bga-opt-card-body">
                            <RelatedToolsPicker
                              value={genRelatedTools}
                              onChange={setGenRelatedTools}
                              title={topic}
                            />
                          </div>
                        </div>
                      </TabPanel>

                      <TabPanel value="style">
                        <div className={`bga-opt-card${collapsed.styleTone ? " is-collapsed" : ""}`}>
                          <div className="bga-opt-card-head">
                            <span className="bga-opt-card-ic">
                              <IconMicrophone size={12} stroke={2} />
                            </span>
                            <b>Giọng &amp; đối tượng</b>
                            <span className="bga-opt-card-dim">Cách viết, dành cho ai</span>
                            <button
                              type="button"
                              className="bga-opt-card-collapse"
                              onClick={() => toggleCollapsed("styleTone")}
                              title={collapsed.styleTone ? "Mở rộng" : "Thu gọn"}
                              aria-label="Thu gọn"
                            >
                              <IconChevronDown size={13} stroke={2} />
                            </button>
                          </div>
                          <div className="bga-opt-card-body">
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
                            </div>
                          </div>
                        </div>

                        <div className={`bga-opt-card${collapsed.styleStruct ? " is-collapsed" : ""}`}>
                          <div className="bga-opt-card-head">
                            <span className="bga-opt-card-ic">
                              <IconArticle size={12} stroke={2} />
                            </span>
                            <b>Cấu trúc &amp; phân phối</b>
                            <span className="bga-opt-card-dim">Khung bài, CTA, ảnh minh hoạ</span>
                            <button
                              type="button"
                              className="bga-opt-card-collapse"
                              onClick={() => toggleCollapsed("styleStruct")}
                              title={collapsed.styleStruct ? "Mở rộng" : "Thu gọn"}
                              aria-label="Thu gọn"
                            >
                              <IconChevronDown size={13} stroke={2} />
                            </button>
                          </div>
                          <div className="bga-opt-card-body">
                            <div className="bga-grid-dense">
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
                          </div>
                        </div>
                      </TabPanel>

                      <TabPanel value="advanced">
                        <div className={`bga-opt-card${collapsed.advAi ? " is-collapsed" : ""}`}>
                          <div className="bga-opt-card-head">
                            <span className="bga-opt-card-ic">
                              <IconBrain size={12} stroke={2} />
                            </span>
                            <b>Chọn AI</b>
                            <span className="bga-opt-card-dim">
                              {genAutoAi ? "Tự chọn theo cấu trúc" : "Chọn thủ công"}
                            </span>
                            <button
                              type="button"
                              className="bga-opt-card-collapse"
                              onClick={() => toggleCollapsed("advAi")}
                              title={collapsed.advAi ? "Mở rộng" : "Thu gọn"}
                              aria-label="Thu gọn"
                            >
                              <IconChevronDown size={13} stroke={2} />
                            </button>
                          </div>
                          <div className="bga-opt-card-body">
                            <label
                              className="bga-toggle-card"
                              title="AI tự chọn theo cấu trúc bài & độ ưu tiên; model cụ thể sẽ hiện ở bước sinh bài"
                            >
                              <Switch
                                checked={genAutoAi}
                                onChange={(e) => {
                                  const on = e.target.checked;
                                  setGenAutoAi(on);
                                  if (on) applyAutoAi(genStructure);
                                }}
                              />
                              <div className="bga-toggle-text">
                                <b>
                                  <IconSparkles size={12} stroke={1.9} /> AI tự chọn theo cấu trúc
                                </b>
                                <span>Model cuối cùng dùng sẽ hiện ở bước &ldquo;Viết bài&rdquo;.</span>
                              </div>
                            </label>
                            <div style={{ marginTop: 8 }} />
                            <Field label={genAutoAi ? "Độ ưu tiên" : "Model AI"}>
                              {genAutoAi ? (
                                <Select
                                  value={genAiPref}
                                  onChange={(e) => {
                                    const pref = e.target.value as AiPreference;
                                    setGenAiPref(pref);
                                    applyAutoAi(genStructure, pref);
                                  }}
                                  selectSize="sm"
                                  options={[
                                    { value: "balanced", label: "Cân bằng — AI khớp cấu trúc bài" },
                                    { value: "quality", label: "Chất lượng — ưu tiên model mạnh (tech/analysis)" },
                                    { value: "speed", label: "Tốc độ — ưu tiên model nhanh" },
                                  ]}
                                />
                              ) : (
                                <Select
                                  value={genModel}
                                  onChange={(e) => setGenModel(e.target.value)}
                                  selectSize="sm"
                                  options={(Object.keys(AI_MODELS) as AiProvider[]).flatMap<SelectOption>((p) =>
                                    AI_MODELS[p].map((m) => ({
                                      value: `${p}|${m.id}`,
                                      label: `${AI_PROVIDER_LABEL[p]} · ${m.label}${m.search ? " · web" : ""}${providers[p] ? "" : " (chưa có key)"}`,
                                      disabled: !providers[p],
                                    })),
                                  )}
                                />
                              )}
                            </Field>
                          </div>
                        </div>

                        <div className={`bga-opt-card${collapsed.advQuality ? " is-collapsed" : ""}`}>
                          <div className="bga-opt-card-head">
                            <span className="bga-opt-card-ic">
                              <IconAdjustmentsHorizontal size={12} stroke={2} />
                            </span>
                            <b>Chất lượng nội dung</b>
                            <span className="bga-opt-card-dim">E-E-A-T, humanize, sáng tạo</span>
                            <button
                              type="button"
                              className="bga-opt-card-collapse"
                              onClick={() => toggleCollapsed("advQuality")}
                              title={collapsed.advQuality ? "Mở rộng" : "Thu gọn"}
                              aria-label="Thu gọn"
                            >
                              <IconChevronDown size={13} stroke={2} />
                            </button>
                          </div>
                          <div className="bga-opt-card-body">
                            <Field label="Mức sáng tạo" hint="Cân bằng độ bám nguồn và góc nhìn riêng">
                              <div className="bga-seg bga-seg-sm">
                                {(
                                  [
                                    { v: "safe", l: "An toàn" },
                                    { v: "balanced", l: "Cân bằng" },
                                    { v: "creative", l: "Sáng tạo" },
                                  ] as const
                                ).map((o) => (
                                  <button
                                    key={o.v}
                                    type="button"
                                    className={genCreativity === o.v ? "is-on" : ""}
                                    onClick={() => setGenCreativity(o.v)}
                                  >
                                    {o.l}
                                  </button>
                                ))}
                              </div>
                            </Field>
                            <div className="bga-toggles" style={{ marginTop: 8 }}>
                              <label className="bga-toggle-card" title="Giảm giọng máy, câu đa dạng, tự nhiên hơn">
                                <Switch checked={genHumanize} onChange={(e) => setGenHumanize(e.target.checked)} />
                                <div className="bga-toggle-text">
                                  <b>
                                    <IconWand size={12} stroke={1.9} /> Humanize
                                  </b>
                                  <span>Giảm &ldquo;AI tells&rdquo; — tự nhiên, đa dạng câu</span>
                                </div>
                              </label>
                              <label
                                className="bga-toggle-card"
                                title="E-E-A-T: kinh nghiệm, chuyên môn, uy tín, đáng tin"
                              >
                                <Switch checked={genEEAT} onChange={(e) => setGenEEAT(e.target.checked)} />
                                <div className="bga-toggle-text">
                                  <b>
                                    <IconShieldCheck size={12} stroke={1.9} /> E-E-A-T boost
                                  </b>
                                  <span>Trích dẫn uy tín, giọng chuyên gia có bằng chứng</span>
                                </div>
                              </label>
                              <label className="bga-toggle-card" title="Diễn giải lại thay vì copy nguyên văn nguồn">
                                <Switch
                                  checked={genOriginality}
                                  onChange={(e) => setGenOriginality(e.target.checked)}
                                />
                                <div className="bga-toggle-text">
                                  <b>
                                    <IconSparkles size={12} stroke={1.9} /> Nguyên bản
                                  </b>
                                  <span>Tổng hợp &amp; diễn giải — tránh trùng nguồn</span>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className={`bga-opt-card${collapsed.advFlow ? " is-collapsed" : ""}`}>
                          <div className="bga-opt-card-head">
                            <span className="bga-opt-card-ic">
                              <IconCircleCheckFilled size={12} />
                            </span>
                            <b>Quy trình</b>
                            <span className="bga-opt-card-dim">Research & kiểm chứng</span>
                            <button
                              type="button"
                              className="bga-opt-card-collapse"
                              onClick={() => toggleCollapsed("advFlow")}
                              title={collapsed.advFlow ? "Mở rộng" : "Thu gọn"}
                              aria-label="Thu gọn"
                            >
                              <IconChevronDown size={13} stroke={2} />
                            </button>
                          </div>
                          <div className="bga-opt-card-body">
                            <div className="bga-toggles">
                              <label className="bga-toggle-card" title="Tra cứu web trước khi viết để có dữ kiện mới">
                                <Switch checked={genResearch} onChange={(e) => setGenResearch(e.target.checked)} />
                                <div className="bga-toggle-text">
                                  <b>
                                    <IconWorldSearch size={12} stroke={1.9} /> Tra cứu web
                                  </b>
                                  <span>Dữ kiện mới, kèm nguồn tham khảo</span>
                                </div>
                              </label>
                              <label className="bga-toggle-card" title="AI thứ hai rà lại bài, bỏ/làm mềm câu nghi bịa">
                                <Switch checked={genFactCheck} onChange={(e) => setGenFactCheck(e.target.checked)} />
                                <div className="bga-toggle-text">
                                  <b>
                                    <IconCircleCheckFilled size={12} /> Kiểm chứng dữ kiện
                                  </b>
                                  <span>Pass 2: bắt hallucination (chậm hơn ~15s)</span>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </TabPanel>
                    </Tabs>
                  </fieldset>

                  {genErr && !genLoading && Object.keys(genSteps).length === 0 && (
                    <div className="fx-err" style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <IconAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {genErr}
                    </div>
                  )}
                  {batchFailed.length > 0 && (
                    <div
                      className="fx-err"
                      style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch" }}
                    >
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <IconAlertTriangle size={14} />
                        <b>{batchFailed.length} bài chưa xong — chọn &ldquo;Thử lại&rdquo; ở dưới để sinh lại.</b>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                        {batchFailed.map((f) => (
                          <li key={f.title}>
                            <b>{f.title}</b>
                            {f.error ? ` — ${f.error}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
              ) : (
                <>
                  <button className="fx-btn" onClick={() => setGenerateOpen(false)}>
                    Đóng
                  </button>
                  {batchFailed.length > 0 && (
                    <button
                      className="fx-btn fx-btn-warn"
                      onClick={() => {
                        const retryItems = batchFailed.map(({ title, angle }) => ({ title, angle }));
                        setBatchFailed([]);
                        setGenSteps({});
                        setGenErr("");
                        setGenAborted(false);
                        generateBatch(retryItems);
                      }}
                      title={`Thử lại ${batchFailed.length} bài lỗi`}
                    >
                      <IconRotateClockwise size={14} /> Thử lại {batchFailed.length} bài lỗi
                    </button>
                  )}
                  {Object.keys(genSteps).length > 0 && (genAborted || genErr) && batchFailed.length === 0 && (
                    <button
                      className="fx-btn"
                      onClick={() => {
                        setGenSteps({});
                        setGenErr("");
                        setGenAborted(false);
                        if (selectedCount > 0) generateBatch();
                        else generate();
                      }}
                      title="Thử sinh lại ngay với cùng tham số"
                    >
                      <IconRotateClockwise size={14} /> Thử lại
                    </button>
                  )}
                  <button
                    className="fx-btn fx-btn-primary"
                    disabled={!topic.trim() && selectedCount === 0}
                    title={!topic.trim() && selectedCount === 0 ? "Nhập chủ đề hoặc chọn ít nhất 1 gợi ý" : undefined}
                    onClick={() => {
                      setGenSteps({});
                      setGenErr("");
                      setGenAborted(false);
                      setBatchFailed([]);
                      selectedCount > 0 ? generateBatch() : generate();
                    }}
                  >
                    <IconSparkles size={14} />
                    {selectedCount > 1 ? `Sinh ${selectedCount} bài` : "Sinh bài AI"}
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
                  label={
                    <span style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                      <span>
                        Title <span className="ui-field-req">*</span>
                      </span>
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
                <Field label="Công cụ liên quan">
                  <RelatedToolsPicker
                    value={editing.relatedTools}
                    onChange={(next) => setEditing((cur) => (cur ? { ...cur, relatedTools: next } : cur))}
                    title={editing.title}
                    tags={editing.tags
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)}
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
                      __html: marked.parse(
                        editing.markdown.replace(/https?\\?:\/\/[^\s)"']+/g, (url) => rewriteImgUrl(url)),
                      ) as string,
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
              {editing.status === "published" ? (
                <Link href={`/blog/${editing.slug}`} target="_blank" className="fx-btn" style={{ marginRight: "auto" }}>
                  <IconExternalLink size={14} /> Xem bài
                </Link>
              ) : (
                <span style={{ marginRight: "auto" }} />
              )}
              {editing.status === "published" ? (
                <>
                  {isSuperAdmin && (
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
                  )}
                  <button className="fx-btn fx-btn-primary" onClick={() => setEditing(null)}>
                    Đóng
                  </button>
                </>
              ) : (
                <>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      className="fx-btn"
                      onClick={openReimageList}
                      disabled={saving}
                      title="Chọn ảnh hiện có trong bài và thay thế bằng ảnh khác"
                    >
                      <IconPhotoSearch size={14} /> AI chọn lại ảnh
                    </button>
                  )}
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
                  {isSuperAdmin && editing.status === "draft" && (
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
                  {isSuperAdmin && (editing.status === "draft" || editing.status === "rejected") && (
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
          title={
            picker.target === "cover"
              ? "Chọn ảnh bìa"
              : picker.target === "replace"
                ? "Chọn ảnh thay thế"
                : "Chèn ảnh vào bài"
          }
          initialQuery={picker.query}
          onPick={pickImage}
          onClose={() => setPicker(null)}
        />
      )}

      {reimageList && editing && (
        <div className="fx-modal-bg" style={{ zIndex: 255 }} onClick={() => setReimageList(null)}>
          <div className="fx-modal" style={{ maxWidth: 820, width: "95vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="fx-modal-head">
              <h2>
                <IconPhotoSearch size={16} stroke={2} /> Ảnh trong bài — chọn ảnh để thay thế
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => setReimageList(null)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body">
              <div className="bga-picker-grid">
                {reimageList.map((it) => (
                  <button
                    key={it.url}
                    type="button"
                    className="bga-picker-item"
                    onClick={() => {
                      setReimageList(null);
                      setPicker({
                        target: "replace",
                        query: photoQuery(it.alt || editing.title, editing.tags.split(",").map((t) => t.trim()).filter(Boolean)),
                        replaceUrl: it.url,
                      });
                    }}
                    title={it.alt}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.url} alt={it.alt} loading="lazy" referrerPolicy="no-referrer" />
                    <span>{it.alt || "(không có mô tả)"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
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

      {/* DID-YOU-KNOW CHOOSER */}
      {dykChooserOpen && (
        <div className="fx-modal-bg" style={{ zIndex: 200 }} onClick={() => setDykChooserOpen(false)}>
          <div className="fx-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="fx-modal-head">
              <h2>
                <IconBulb size={16} stroke={2} /> Thêm kiến thức
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => setDykChooserOpen(false)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                className="fx-btn"
                style={{ flexDirection: "column", padding: 16, height: "auto", gap: 6 }}
                onClick={() => {
                  setDykChooserOpen(false);
                  openNewDyk();
                }}
              >
                <IconEdit size={22} stroke={1.7} />
                <b>Thủ công</b>
                <span style={{ fontSize: 11, color: "var(--dim)", textAlign: "center" }}>
                  Tự nhập tiêu đề, mô tả, URL ảnh
                </span>
              </button>
              {isSuperAdmin && (
                <button
                  type="button"
                  className="fx-btn fx-btn-primary"
                  style={{ flexDirection: "column", padding: 16, height: "auto", gap: 6 }}
                  onClick={() => {
                    setDykChooserOpen(false);
                    setDykAiOpen(true);
                    setDykAiErr("");
                  }}
                >
                  <IconSparkles size={22} stroke={1.9} />
                  <b>AI tự sinh</b>
                  <span style={{ fontSize: 11, opacity: 0.85, textAlign: "center" }}>
                    AI chọn chủ đề + viết nội dung + tìm ảnh
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DID-YOU-KNOW AI MODAL */}
      {isSuperAdmin && dykAiOpen && (
        <div className="fx-modal-bg" style={{ zIndex: 200 }}>
          <div className="fx-modal" style={{ maxWidth: 560 }}>
            <div className="fx-modal-head">
              <h2>
                <IconSparkles size={16} stroke={2} /> Sinh kiến thức bằng AI
                <span className="fx-badge">AI</span>
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => !dykAiLoading && setDykAiOpen(false)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body">
              <Field label="Chủ đề (để trống → AI tự chọn)">
                <Input
                  autoFocus
                  value={dykAiTopic}
                  disabled={dykAiLoading}
                  onChange={(e) => setDykAiTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !dykAiLoading && generateDykAi()}
                  placeholder="VD: hiện tượng cực quang, loài bạch tuộc, lịch sử cà phê…"
                />
              </Field>
              <Field label={`Số ảnh (${dykAiCount})`}>
                <div className="bga-seg bga-seg-sm">
                  {[3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={dykAiCount === n ? "is-on" : ""}
                      onClick={() => setDykAiCount(n)}
                      disabled={dykAiLoading}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </Field>
              {dykAiErr && <div className="fx-err">{dykAiErr}</div>}
              <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6 }}>
                AI sẽ sinh tiêu đề, mô tả song ngữ VI/EN và tự tìm ảnh minh họa, rồi lưu vào DB. Bạn có thể sửa lại sau.
              </div>
            </div>
            <div className="fx-modal-foot">
              <button className="fx-btn" onClick={() => setDykAiOpen(false)} disabled={dykAiLoading}>
                Huỷ
              </button>
              <button className="fx-btn fx-btn-primary" onClick={generateDykAi} disabled={dykAiLoading}>
                {dykAiLoading ? (
                  <>
                    <IconLoader2 size={14} className="spin" /> Đang sinh…
                  </>
                ) : (
                  <>
                    <IconSparkles size={14} stroke={2.2} /> Sinh ngay
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DID-YOU-KNOW EDIT MODAL */}
      {dykEditing && (
        <div className="fx-modal-bg" style={{ zIndex: 200 }}>
          <div className="fx-modal" style={{ maxWidth: 720, width: "96vw" }}>
            <div className="fx-modal-head">
              <h2>
                <IconBulb size={16} stroke={2} /> {dykEditing.isNew ? "Thêm kiến thức" : "Sửa kiến thức"}
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => !dykSaving && setDykEditing(null)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body">
              <div className="bga-grid2">
                <Field label="Tag (VI)">
                  <Input
                    value={dykEditing.tag_vi}
                    disabled={dykSaving}
                    onChange={(e) => setDykEditing((cur) => (cur ? { ...cur, tag_vi: e.target.value } : cur))}
                    placeholder="VD: Thiên nhiên"
                  />
                </Field>
                <Field label="Tag (EN)">
                  <Input
                    value={dykEditing.tag_en}
                    disabled={dykSaving}
                    onChange={(e) => setDykEditing((cur) => (cur ? { ...cur, tag_en: e.target.value } : cur))}
                    placeholder="VD: Nature"
                  />
                </Field>
              </div>
              <Field label="Tiêu đề (VI)" required>
                <Input
                  autoFocus
                  value={dykEditing.title_vi}
                  disabled={dykSaving}
                  onChange={(e) => setDykEditing((cur) => (cur ? { ...cur, title_vi: e.target.value } : cur))}
                />
              </Field>
              <Field label="Tiêu đề (EN)">
                <Input
                  value={dykEditing.title_en}
                  disabled={dykSaving}
                  onChange={(e) => setDykEditing((cur) => (cur ? { ...cur, title_en: e.target.value } : cur))}
                />
              </Field>
              <Field label="Giới thiệu (VI)">
                <Textarea
                  rows={2}
                  value={dykEditing.intro_vi}
                  disabled={dykSaving}
                  onChange={(e) => setDykEditing((cur) => (cur ? { ...cur, intro_vi: e.target.value } : cur))}
                />
              </Field>
              <Field label="Giới thiệu (EN)">
                <Textarea
                  rows={2}
                  value={dykEditing.intro_en}
                  disabled={dykSaving}
                  onChange={(e) => setDykEditing((cur) => (cur ? { ...cur, intro_en: e.target.value } : cur))}
                />
              </Field>
              <div className="bga-grid2">
                <Field label={`Slug ${dykEditing.isNew ? "(auto từ title)" : "(cố định)"}`}>
                  <Input
                    value={dykEditing.slug}
                    disabled={dykSaving || !dykEditing.isNew}
                    monospace
                    onChange={(e) => setDykEditing((cur) => (cur ? { ...cur, slug: e.target.value } : cur))}
                  />
                </Field>
                <Field label="Thứ tự">
                  <Input
                    type="number"
                    value={dykEditing.sort}
                    disabled={dykSaving}
                    onChange={(e) =>
                      setDykEditing((cur) => (cur ? { ...cur, sort: Number(e.target.value) || 0 } : cur))
                    }
                  />
                </Field>
              </div>
              <Field label="Hiển thị công khai">
                <div className="bga-switch-row">
                  <Switch
                    checked={dykEditing.active}
                    disabled={dykSaving}
                    onChange={(e) => setDykEditing((cur) => (cur ? { ...cur, active: e.target.checked } : cur))}
                  />
                  <span className="bga-switch-lbl">{dykEditing.active ? "Bật" : "Tắt"}</span>
                </div>
              </Field>

              <Field label={`Ảnh (${dykEditing.images.length})`}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {dykEditing.images.map((im, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "56px 1fr 32px",
                        gap: 8,
                        alignItems: "start",
                        padding: 8,
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        background: "var(--bg2)",
                      }}
                    >
                      <div className="bga-thumb" style={{ width: 56, height: 56 }}>
                        {im.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={rewriteImgUrl(im.url)} alt="" loading="lazy" referrerPolicy="no-referrer" />
                        ) : (
                          <span style={{ background: "linear-gradient(135deg,#64748b,#334155)" }} />
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <Input
                          value={im.url}
                          disabled={dykSaving}
                          placeholder="URL ảnh"
                          onChange={(e) =>
                            setDykEditing((cur) =>
                              cur
                                ? {
                                    ...cur,
                                    images: cur.images.map((x, i) => (i === idx ? { ...x, url: e.target.value } : x)),
                                  }
                                : cur,
                            )
                          }
                        />
                        <div className="bga-grid2">
                          <Input
                            value={im.caption_vi}
                            disabled={dykSaving}
                            placeholder="Caption VI"
                            onChange={(e) =>
                              setDykEditing((cur) =>
                                cur
                                  ? {
                                      ...cur,
                                      images: cur.images.map((x, i) =>
                                        i === idx ? { ...x, caption_vi: e.target.value } : x,
                                      ),
                                    }
                                  : cur,
                              )
                            }
                          />
                          <Input
                            value={im.caption_en}
                            disabled={dykSaving}
                            placeholder="Caption EN"
                            onChange={(e) =>
                              setDykEditing((cur) =>
                                cur
                                  ? {
                                      ...cur,
                                      images: cur.images.map((x, i) =>
                                        i === idx ? { ...x, caption_en: e.target.value } : x,
                                      ),
                                    }
                                  : cur,
                              )
                            }
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="fx-btn fx-btn-icon fx-btn-danger"
                        onClick={() =>
                          setDykEditing((cur) =>
                            cur ? { ...cur, images: cur.images.filter((_, i) => i !== idx) } : cur,
                          )
                        }
                        title="Xoá ảnh"
                        disabled={dykSaving}
                      >
                        <IconTrash size={14} stroke={1.9} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="fx-btn"
                    onClick={() =>
                      setDykEditing((cur) =>
                        cur ? { ...cur, images: [...cur.images, { url: "", caption_vi: "", caption_en: "" }] } : cur,
                      )
                    }
                    disabled={dykSaving}
                  >
                    <IconPlus size={13} stroke={1.9} /> Thêm ảnh
                  </button>
                </div>
              </Field>

              {dykErr && <div className="fx-err">{dykErr}</div>}
            </div>
            <div className="fx-modal-foot">
              <button className="fx-btn" onClick={() => setDykEditing(null)} disabled={dykSaving}>
                Huỷ
              </button>
              <button
                className="fx-btn fx-btn-primary"
                onClick={saveDyk}
                disabled={dykSaving || !dykEditing.title_vi.trim()}
              >
                {dykSaving ? (
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
