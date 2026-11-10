"use client";
import "@/app/blog/blog.css";
import { useToast } from "@/components/Toast";
import type { SelectOption } from "@/components/ui";
import { Button, Field, Input, Select, Switch, Tab, TabPanel, Tabs, TabsList, Textarea } from "@/components/ui";
import {
  DEFAULT_PIN_CONFIG,
  MAX_PINNED,
  resolvePinnedPosts,
  rewriteImgUrl,
  slugifyLabel,
  type BlogCategory,
  type BlogCategoryRow,
  type BlogPinConfig,
  type BlogPinMode,
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
  isAutoStalled,
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
  IconArrowDown,
  IconArrowsLeftRight,
  IconArrowUp,
  IconArticle,
  IconBook,
  IconBrain,
  IconBrandYoutube,
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
  IconRuler,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminBody from "../AdminBody";
import AutoModePanel, { type AutoRunSettings } from "./AutoModePanel";
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
  initialPinConfig?: BlogPinConfig;
  popularity?: Record<string, number>;
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
  video: "Tìm video YouTube liên quan",
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
  initialPinConfig,
  popularity,
}: Props) {
  const toast = useToast();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [cats, setCats] = useState<BlogCategoryRow[]>(initialCategories);
  const [dyk, setDyk] = useState<DidYouKnowItem[]>(initialDidYouKnow || []);
  const [q, setQ] = useState("");
  const [pinPickerOpen, setPinPickerOpen] = useState(false);
  const [pinPickerQ, setPinPickerQ] = useState("");
  const [pinConfig, setPinConfig] = useState<BlogPinConfig>(initialPinConfig || DEFAULT_PIN_CONFIG);
  const [pinConfigSaving, setPinConfigSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tab, setTab] = useState<"posts" | "categories" | "series" | "knowledge" | "images">("posts");

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

  const [dykQuizProgress, setDykQuizProgress] = useState("");
  const dykMissingQuiz = dyk.filter((it) => !it.quiz?.length);

  // One request per item: each is a full LLM call, too slow to batch in one route.
  async function backfillDykQuiz() {
    let failed = 0;
    let lastError = "";
    for (let i = 0; i < dykMissingQuiz.length; i++) {
      setDykQuizProgress(`${i + 1}/${dykMissingQuiz.length}`);
      try {
        const r = await fetch("/api/blog/did-you-know/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: dykMissingQuiz[i].slug, provider: genProvider }),
        });
        if (!r.ok) {
          failed++;
          lastError = (await r.json().catch(() => null))?.error || `Lỗi ${r.status}`;
        }
      } catch (e: any) {
        failed++;
        lastError = e?.message || "Lỗi";
      }
    }
    setDykQuizProgress("");
    await reloadDyk();
    toast(failed ? `Lỗi ${failed}/${dykMissingQuiz.length} mục: ${lastError}` : "Đã sinh quiz cho các mục còn thiếu");
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

  type SeriesGroupAdmin = {
    slug: string;
    label: string;
    parts: {
      slug: string;
      title: string;
      date: string;
      status: BlogStatus;
      category: string;
      coverImage: string | null;
      order: number;
    }[];
  };
  const [seriesGroups, setSeriesGroups] = useState<SeriesGroupAdmin[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesEditor, setSeriesEditor] = useState<{
    original: SeriesGroupAdmin | null;
    slug: string;
    slugs: string[];
    pickQ: string;
  } | null>(null);
  const [seriesSaving, setSeriesSaving] = useState(false);
  const [seriesErr, setSeriesErr] = useState("");

  const loadSeries = useCallback(async () => {
    setSeriesLoading(true);
    try {
      const r = await fetch("/api/blog/series");
      const j = await r.json();
      if (Array.isArray(j?.groups)) setSeriesGroups(j.groups as SeriesGroupAdmin[]);
    } catch {
      /* ignore */
    } finally {
      setSeriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "series") void loadSeries();
  }, [tab, loadSeries]);

  function openSeriesEditor(group: SeriesGroupAdmin | null) {
    setSeriesErr("");
    setSeriesEditor({
      original: group,
      // Prefill with the display label (with diacritics) when editing;
      // the slug is derived from it on save.
      slug: group?.label ?? "",
      slugs: group ? group.parts.map((p) => p.slug) : [],
      pickQ: "",
    });
  }

  function moveSeriesSlug(i: number, dir: -1 | 1) {
    setSeriesEditor((s) => {
      if (!s) return s;
      const j = i + dir;
      if (j < 0 || j >= s.slugs.length) return s;
      const next = s.slugs.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return { ...s, slugs: next };
    });
  }

  function addSeriesSlug(slug: string) {
    setSeriesEditor((s) => (s && !s.slugs.includes(slug) ? { ...s, slugs: [...s.slugs, slug] } : s));
  }
  function removeSeriesSlug(slug: string) {
    setSeriesEditor((s) => (s ? { ...s, slugs: s.slugs.filter((x) => x !== slug) } : s));
  }

  async function saveSeries() {
    if (!seriesEditor) return;
    const label = seriesEditor.slug.trim();
    const slug = slugifyLabel(label);
    if (!slug) {
      setSeriesErr("Vui lòng nhập tên series.");
      return;
    }
    if (seriesEditor.slugs.length < 2) {
      setSeriesErr("Chọn ít nhất 2 bài để tạo series.");
      return;
    }
    setSeriesSaving(true);
    setSeriesErr("");
    try {
      const r = await fetch("/api/blog/series", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          label,
          previousSlug: seriesEditor.original?.slug ?? null,
          slugs: seriesEditor.slugs,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Lỗi lưu series");
      toast(`Đã lưu series "${slug}" (${j.count} phần)`);
      setSeriesEditor(null);
      // Update local post tags optimistically so the Series tab reflects the save
      // without a full reload; the server has already persisted them.
      const snameTag = j?.snameTag as string | undefined;
      setPosts((prev) =>
        prev.map((p) => {
          const stripped = (p.tags || []).filter((t) => {
            const l = t.toLowerCase();
            return !l.startsWith("series/") && !l.startsWith("part/") && !l.startsWith("sname/");
          });
          const idx = seriesEditor.slugs.indexOf(p.slug);
          const wasInThisSeries = (p.tags || []).some(
            (t) => t.toLowerCase() === `series/${seriesEditor.original?.slug ?? slug}`,
          );
          if (idx >= 0) {
            const next = [...stripped, `series/${slug}`, `part/${idx + 1}`];
            if (snameTag) next.push(snameTag);
            return { ...p, tags: next };
          }
          if (wasInThisSeries) return { ...p, tags: stripped };
          return p;
        }),
      );
      await loadSeries();
    } catch (e: any) {
      setSeriesErr(e?.message || "Lỗi lưu series");
    } finally {
      setSeriesSaving(false);
    }
  }

  async function deleteSeries(group: SeriesGroupAdmin) {
    if (!confirm(`Xoá series "${group.label}"? Các bài sẽ không mất, chỉ gỡ tag series/part.`)) return;
    try {
      const r = await fetch(`/api/blog/series?slug=${encodeURIComponent(group.slug)}`, {
        method: "DELETE",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Lỗi xoá");
      toast(`Đã gỡ series "${group.slug}"`);
      setPosts((prev) =>
        prev.map((p) =>
          (p.tags || []).some((t) => t.toLowerCase() === `series/${group.slug}`)
            ? {
                ...p,
                tags: (p.tags || []).filter((t) => {
                  const l = t.toLowerCase();
                  return !l.startsWith("series/") && !l.startsWith("part/");
                }),
              }
            : p,
        ),
      );
      await loadSeries();
    } catch (e: any) {
      toast(e?.message || "Lỗi xoá series");
    }
  }

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
  const [pinModalOpen, setPinModalOpen] = useState(false);

  // AdminTabBar dispatches these so the bottom bar can trigger the modals.
  const [skipTopicAutoFocus, setSkipTopicAutoFocus] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      const kind = (e as CustomEvent<{ kind: "manual" | "generate" | "pin" }>).detail?.kind;
      if (kind === "manual") setManualOpen(true);
      else if (kind === "pin") setPinModalOpen(true);
      else if (kind === "generate" && isSuperAdmin) {
        setSkipTopicAutoFocus(true);
        setGenerateOpen(true);
      }
    };
    window.addEventListener("fb:blog-admin-action", handler);
    return () => window.removeEventListener("fb:blog-admin-action", handler);
  }, [isSuperAdmin]);
  const firstProvider = (Object.keys(AI_MODELS) as AiProvider[]).find((p) => providers[p]) || "pollinations";
  const [genModel, setGenModel] = useState(`${firstProvider}|${AI_MODELS[firstProvider][0].id}`);
  const genProvider = genModel.split("|")[0] as AiProvider;
  const [genCategory, setGenCategory] = useState<BlogCategory>(initialCategories[0]?.slug || "tech");
  const [genTone, setGenTone] = useState<GenTone>("friendly");
  const [genLength, setGenLength] = useState<GenLength>("medium");
  const [genImages, setGenImages] = useState(4);
  const [genResearch, setGenResearch] = useState(true);
  const [genNotes, setGenNotes] = useState("");
  const [genAudience, setGenAudience] = useState<GenAudience>("mixed");
  const [genStructure, setGenStructure] = useState<GenStructure>("news");
  const [genSeoKeyword, setGenSeoKeyword] = useState("");
  const [genExtras, setGenExtras] = useState<GenExtra[]>(["tldr", "stats"]);
  const [genCta, setGenCta] = useState<GenCta>("share");
  const [genRegion, setGenRegion] = useState<GenRegion>("global");
  const [genImageStyle, setGenImageStyle] = useState<GenImageStyle>("photo");
  const [genFactCheck, setGenFactCheck] = useState(true);
  const [genInternalLinks, setGenInternalLinks] = useState(true);
  const [genIncludeVideo, setGenIncludeVideo] = useState(false);
  const [genAutoAi, setGenAutoAi] = useState(true);
  const [genAiPref, setGenAiPref] = useState<AiPreference>("balanced");
  const [genPreset, setGenPreset] = useState<string>("news");
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
  // Mutable queue of posts waiting to be generated after the current one.
  // The ref holds the source of truth (the loop reads it each iteration);
  // the state mirrors it so the UI can render + the user can reorder/remove.
  type BatchItem = { title: string; angle: string };
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [batchCurrent, setBatchCurrent] = useState<BatchItem | null>(null);
  const queueRef = useRef<BatchItem[]>([]);
  const updateQueue = (next: BatchItem[]) => {
    queueRef.current = next;
    setBatchQueue(next);
  };
  const [batchFailed, setBatchFailed] = useState<{ title: string; angle: string; error: string }[]>([]);
  // Restore failed drafts from localStorage so the user doesn't lose them
  // when the page reloads mid-generation.
  const FAILED_LS_KEY = "bga-failed-drafts";
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(FAILED_LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved) && saved.length > 0) {
        setBatchFailed(saved);
      }
    } catch {}
  }, []);
  // Persist failed drafts whenever the list changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (batchFailed.length > 0) {
        localStorage.setItem(FAILED_LS_KEY, JSON.stringify(batchFailed));
      } else {
        localStorage.removeItem(FAILED_LS_KEY);
      }
    } catch {}
  }, [batchFailed]);
  const batchStartRef = useRef<number>(0);
  const [batchEtaSec, setBatchEtaSec] = useState<number | null>(null);
  const batchAbortRef = useRef(false);
  // Khi người dùng bấm "Huỷ sinh bài", ta muốn quay lại form tuỳ chọn thay vì
  // đứng lại ở màn tiến trình "Đã huỷ" — cờ này báo cho các nhánh async biết.
  const userCancelRef = useRef(false);
  const lastGenErrRef = useRef("");
  const selectedCount = Object.keys(selectedIdeas).length;

  // Auto-generate mode: the job lives in Supabase and pg_cron drives it (see
  // lib/blog-auto.ts), so it keeps running after the admin closes the tab or
  // the browser. The UI just posts start/stop and polls GET /status.
  const [genMode, setGenMode] = useState<"config" | "auto">("config");
  // A running manual generation (e.g. a retry) always shows its progress view.
  const showAutoMode = genMode === "auto" && !genLoading && !batchRunning;
  const [autoProgressOpen, setAutoProgressOpen] = useState(false);
  type AutoRecent = { title: string; slug: string; at: number };
  type AutoStatusApi = {
    running: boolean;
    category: string;
    unlimited: boolean;
    targetCount: number;
    generated: number;
    failed: number;
    currentTopic: string;
    startedAt: number | null;
    lastEventAt: number | null;
    lockedUntil: number | null;
    recent: AutoRecent[];
    lastError?: string;
  };
  const [autoStatus, setAutoStatus] = useState<AutoStatusApi>({
    running: false,
    category: "random",
    unlimited: false,
    targetCount: 0,
    generated: 0,
    failed: 0,
    currentTopic: "",
    startedAt: null,
    lastEventAt: null,
    lockedUntil: null,
    recent: [],
  });
  const autoRunning = autoStatus.running;
  const autoGenerated = autoStatus.generated;
  const autoFailed = autoStatus.failed;
  const autoCurrentTopic = autoStatus.currentTopic;
  // Re-evaluated on each status poll.
  const autoStalled = isAutoStalled(autoStatus, Date.now());

  // Bulk draft selection (checkbox) for batch-approve from the list view.
  const [selectedDraftSlugs, setSelectedDraftSlugs] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  useEffect(() => {
    if (!genLoading) return;
    const t0 = Date.now();
    setGenElapsed(0);
    const id = setInterval(() => setGenElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [genLoading]);

  // Image picker + AI assist in the editor
  const [picker, setPicker] = useState<
    null | { target: "cover" | "inline"; query: string } | { target: "replace"; query: string; replaceUrl: string }
  >(null);
  const [assisting, setAssisting] = useState<string | null>(null);
  const [editView, setEditView] = useState<"write" | "preview">("write");
  const mdRef = useRef<HTMLTextAreaElement>(null);
  type ReimageItem =
    | { kind: "image"; url: string; alt: string }
    | { kind: "video"; videoId: string; raw: string; title: string };
  const [reimageList, setReimageList] = useState<null | Array<ReimageItem>>(null);
  const [videoPicker, setVideoPicker] = useState<null | { replaceRaw: string; query: string }>(null);
  const [videoResults, setVideoResults] = useState<
    Array<{ id: string; title: string; channel?: string; duration?: string; thumb?: string }>
  >([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoErr, setVideoErr] = useState("");

  // Edit modal
  type EditingState = {
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
  };
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState("");

  const editDirty = useMemo(() => {
    if (!editing || !editingOriginal) return false;
    const a = editing;
    const b = editingOriginal;
    return (
      a.title !== b.title ||
      a.excerpt !== b.excerpt ||
      a.category !== b.category ||
      a.tags !== b.tags ||
      Number(a.readMin) !== Number(b.readMin) ||
      a.markdown !== b.markdown ||
      (a.coverImage || "") !== (b.coverImage || "") ||
      a.relatedTools.join(",") !== b.relatedTools.join(",")
    );
  }, [editing, editingOriginal]);

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
    const inBatch = batchRunning && batchTotal > 0;
    const msg = inBatch
      ? `Huỷ sinh bài? Đang chạy ${batchIdx}/${batchTotal} bài — tiến độ hiện tại sẽ bị bỏ.`
      : "Huỷ sinh bài? Nội dung đang sinh sẽ bị bỏ.";
    if (!confirm(msg)) return;
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

  // Content settings of the Config mode, shared by manual and Auto runs.
  function genContentOptions(baseNotes: string) {
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

    return {
      notes: [
        baseNotes,
        seoBits.length ? `[SEO] ${seoBits.join(" ")}` : "",
        styleBits.length ? `[STYLE] ${styleBits.join(" ")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      tone: genTone,
      length: genLength,
      images: genImages,
      research: genResearch,
      audience: genAudience,
      structure: genStructure,
      seoKeyword: genSeoKeyword,
      extras: genExtras,
      cta: genCta,
      region: genRegion,
      imageStyle: genImageStyle,
      factCheck: genFactCheck,
      internalLinks: genInternalLinks,
      includeVideo: genIncludeVideo,
      relatedTools: genRelatedTools,
    };
  }

  async function generate(override?: { topic?: string; notes?: string }) {
    const t = (override?.topic ?? topic).trim();
    const useRandom = !t;
    // Trigger from the user-gesture click so Chrome accepts the prompt.
    void ensureNotifPermission();
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
      ...(genIncludeVideo ? { video: { status: "pending" as const } } : {}),
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
          ...genContentOptions((override?.notes ?? genNotes).trim()),
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
        void notifyNewPost(post.title, post.slug);
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
        // Standalone single-generate failure (not inside batch): save it so
        // the user doesn't lose the attempt on reload.
        if (!batchAbortRef.current && !batchRunning && t) {
          const failedItem = {
            title: t,
            angle: (override?.notes ?? genNotes).trim(),
            error: final,
          };
          setBatchFailed((prev) => {
            if (prev.some((p) => p.title === failedItem.title)) return prev;
            return [...prev, failedItem];
          });
        }
      }
    } finally {
      setGenLoading(false);
      genAbortRef.current = null;
    }
    return null;
  }

  async function generateBatch(itemsOverride?: { title: string; angle: string }[]) {
    const initial = itemsOverride || Object.entries(selectedIdeas).map(([title, angle]) => ({ title, angle }));
    if (!initial.length) return;
    batchAbortRef.current = false;
    batchStartRef.current = Date.now();
    setBatchEtaSec(null);
    setBatchRunning(true);
    setBatchTotal(initial.length);
    setBatchFailed([]);
    // Seed the mutable queue: first item becomes current, rest wait in queue.
    const first = initial[0];
    updateQueue(initial.slice(1));
    setBatchCurrent(first);
    let ok = 0;
    let doneIdx = 0;
    const failed: { title: string; angle: string; error: string }[] = [];
    let current: BatchItem | null = first;
    while (current && !batchAbortRef.current) {
      doneIdx++;
      setBatchIdx(doneIdx);
      setGenSteps({});
      setGenErr("");
      setGenAborted(false);
      let r: BlogPost | null = null;
      try {
        r = (await generate({ topic: current.title, notes: current.angle })) || null;
      } catch (e: any) {
        r = null;
      }
      if (r) ok++;
      else failed.push({ ...current, error: lastGenErrRef.current || "Lỗi không xác định" });
      // Update ETA from average time per completed post.
      const elapsedMs = Date.now() - batchStartRef.current;
      const avgMs = elapsedMs / doneIdx;
      const remainingCount = queueRef.current.length;
      setBatchEtaSec(remainingCount > 0 ? Math.round((avgMs * remainingCount) / 1000) : null);
      // Pick the next item FROM THE REF (user may have reordered/removed it
      // while the previous post was generating).
      const remaining = queueRef.current;
      if (!remaining.length) break;
      current = remaining[0];
      updateQueue(remaining.slice(1));
      setBatchCurrent(current);
      // Also bump the total if the user removed items mid-run.
      setBatchTotal(doneIdx + remaining.length);
      // Short gap between runs to let rate limits breathe.
      if (!batchAbortRef.current) await new Promise((res) => setTimeout(res, 800));
    }
    // Anything the user removed OR left after abort stays as "chưa xong".
    if (batchAbortRef.current) {
      for (const q of queueRef.current) failed.push({ ...q, error: "Đã huỷ" });
    }
    setBatchRunning(false);
    setBatchTotal(0);
    setBatchIdx(0);
    setBatchCurrent(null);
    setBatchEtaSec(null);
    updateQueue([]);
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
    const totalRun = ok + failed.length;
    toast(`Đã sinh ${ok}/${totalRun} bài${failed.length ? ` · ${failed.length} lỗi` : ""}`);
  }

  // Create the server-side job. The UI then polls /status for progress; the
  // job runs even if the admin closes this tab / browser.
  async function startAutoMode({ unlimited, count, gapMinutes }: AutoRunSettings) {
    // Fire the permission prompt from this click handler so Chrome allows it.
    void ensureNotifPermission();
    try {
      const r = await fetch("/api/blog/auto/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: genCategory,
          unlimited,
          count,
          provider: genProvider,
          model: genModel.split("|")[1],
          options: { ...genContentOptions(genNotes.trim()), gapMinutes },
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        toast(j?.error || "Không khởi động được chế độ Tự động");
        return false;
      }
      if (j.status) setAutoStatus(j.status);
      setGenerateOpen(false);
      toast("Đã khởi động sinh tự động trên server");
      return true;
    } catch (e: any) {
      toast(e?.message || "Lỗi");
      return false;
    }
  }

  async function stopAutoMode() {
    try {
      const r = await fetch("/api/blog/auto/stop", { method: "POST" });
      const j = await r.json();
      if (!r.ok) {
        toast(j?.error || "Không dừng được");
        return;
      }
      if (j.status) setAutoStatus(j.status);
      toast("Đã yêu cầu dừng sinh tự động");
    } catch (e: any) {
      toast(e?.message || "Lỗi");
    }
  }

  // One tick = one generated post. The server route holds the Supabase lease so
  // pg_cron and this manual fire cannot overlap. Guard against re-entry on the
  // client so the 3.5s poll doesn't start a second tick while one is running.
  const tickingRef = useRef(false);
  async function fireAutoTick(manual = false) {
    if (tickingRef.current) {
      if (manual) toast("Đang có lượt tick chạy, chờ xong rồi thử lại");
      return;
    }
    tickingRef.current = true;
    try {
      const r = await fetch("/api/blog/auto/tick", { method: "POST" });
      const j = await r.json();
      if (!r.ok) {
        if (manual) toast(j?.error || "Không chạy được tick");
        return;
      }
      if (j.status) setAutoStatus(j.status);
      if (manual) toast(`Tick: ${j.result}`);
    } catch (e: any) {
      if (manual) toast(e?.message || "Lỗi");
    } finally {
      tickingRef.current = false;
    }
  }

  // Keep status fresh: on mount (resume UI after reopening tab) and poll while
  // the server job is active. Also refresh the draft list after each new post
  // appears so the table stays in sync without full reload.
  // Register the shared /sw.js so the browser can show rich notifications
  // (with Duyệt / Từ chối actions) when a new auto-generated post lands.
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await navigator.serviceWorker.getRegistration("/sw.js");
        const reg = existing || (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
        if (!cancelled) swRegRef.current = reg;
      } catch {}
    })();
    const onMsg = (e: MessageEvent) => {
      const d = (e.data || {}) as { type?: string; slug?: string; action?: string; ok?: boolean };
      if (d.type !== "blog-post-acted" || !d.slug) return;
      const newStatus: BlogStatus = d.action === "approve" ? "published" : "rejected";
      setPosts((prev) => prev.map((p) => (p.slug === d.slug ? { ...p, status: newStatus } : p)));
      toast(d.ok ? `${d.action === "approve" ? "Đã duyệt" : "Đã từ chối"}: ${d.slug}` : `Lỗi thao tác: ${d.slug}`);
      router.refresh();
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", onMsg);
    };
  }, [router, toast]);

  // Ask for Notification permission the first time an auto run starts — the
  // admin wants browser popups so they can approve/reject outside this tab.
  async function ensureNotifPermission(): Promise<boolean> {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    try {
      const p = await Notification.requestPermission();
      return p === "granted";
    } catch {
      return false;
    }
  }

  async function notifyNewPost(postTitle: string, slug: string) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const reg = swRegRef.current || (await navigator.serviceWorker?.ready.catch(() => null));
    if (!reg) return;
    try {
      await reg.showNotification("Bài blog mới vừa sinh", {
        body: postTitle,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: `fb-blog-new-${slug}`,
        requireInteraction: true,
        data: { slug, title: postTitle, url: "/admin/blog" },
        // Chrome/Edge render these as inline buttons on desktop + Android.
        // Safari/iOS ignores them silently; clicking the notification body
        // still focuses /admin/blog.
        actions: [
          { action: "approve", title: "Duyệt nhanh" },
          { action: "reject", title: "Từ chối" },
        ],
      } as NotificationOptions & { actions?: { action: string; title: string }[] });
    } catch {}
  }

  useEffect(() => {
    let cancelled = false;
    // Seeded from the first poll so toasts don't fire for posts generated
    // before this tab was opened.
    const prev = {
      gen: -1,
      failed: -1,
      running: null as boolean | null,
      topic: "",
      error: "",
    };
    async function poll() {
      try {
        const r = await fetch("/api/blog/auto/status", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as AutoStatusApi;
        if (cancelled) return;
        setAutoStatus(j);
        // First poll just records the baseline.
        if (prev.gen === -1) {
          prev.gen = j.generated;
          prev.failed = j.failed;
          prev.running = j.running;
          prev.topic = j.currentTopic;
          prev.error = j.lastError || "";
          return;
        }
        if (j.generated > prev.gen) {
          const latest = j.recent[0];
          if (latest) {
            toast(`Auto · đã sinh "${latest.title}"`);
            void notifyNewPost(latest.title, latest.slug);
          }
          prev.gen = j.generated;
          router.refresh();
        }
        if (j.failed > prev.failed) {
          toast(`Auto · lỗi: ${(j.lastError || "Lỗi không xác định").slice(0, 140)}`);
          prev.failed = j.failed;
        }
        // Topic transitions (e.g. "tech · đang khởi động…" → "tech · lập dàn ý")
        // let the user follow what the job is doing in real time.
        if (j.running && j.currentTopic && j.currentTopic !== prev.topic) {
          toast(`Auto · ${j.currentTopic}`);
          prev.topic = j.currentTopic;
        }
        // Job stopped on its own (ran out of retries, reached target, etc.).
        if (prev.running === true && !j.running) {
          const why = j.lastError
            ? `lỗi: ${j.lastError.slice(0, 120)}`
            : `đã sinh ${j.generated} bài`;
          toast(`Auto đã dừng · ${why}`);
        }
        prev.running = j.running;
        prev.error = j.lastError || "";
        // Keep the queue moving even when pg_cron can't reach this host
        // (local dev) or is lagging (gap minute boundary). Fires at most one
        // tick at a time — the ref guard inside fireAutoTick prevents overlap.
        if (
          j.running &&
          !tickingRef.current &&
          (j.lockedUntil == null || j.lockedUntil < Date.now() - 2_000)
        ) {
          void fireAutoTick();
        }
      } catch {}
    }
    poll();
    const id = setInterval(poll, 3500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router, toast]);

  async function bulkApprove() {
    const slugs = Array.from(selectedDraftSlugs);
    if (!slugs.length) return;
    if (!confirm(`Duyệt ${slugs.length} bài đã chọn?`)) return;
    setBulkApproving(true);
    let ok = 0;
    for (const slug of slugs) {
      try {
        const r = await fetch("/api/blog/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        if (r.ok) ok++;
      } catch {}
    }
    setPosts((prev) => prev.map((x) => (slugs.includes(x.slug) ? { ...x, status: "published" } : x)));
    setSelectedDraftSlugs(new Set());
    setBulkApproving(false);
    toast(`Đã duyệt ${ok}/${slugs.length} bài`);
    router.refresh();
  }

  function toggleDraftSelected(slug: string) {
    setSelectedDraftSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
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

  async function savePinConfig(next: BlogPinConfig) {
    const prev = pinConfig;
    setPinConfig(next);
    setPinConfigSaving(true);
    try {
      const r = await fetch("/api/blog/pin-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `Lỗi ${r.status}`);
      const label =
        next.mode === "manual" ? "Thủ công" : next.mode === "auto" ? "Tự động" : `Danh mục: ${CAT_LABEL[next.category!] || next.category}`;
      toast(`Đã chuyển chế độ ghim: ${label}`);
      router.refresh();
    } catch (e: any) {
      setPinConfig(prev);
      toast(e?.message || "Lỗi");
    } finally {
      setPinConfigSaving(false);
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
    const seen = new Set<string>();
    const items: Array<ReimageItem> = [];
    const imgRe = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(md))) {
      const url = m[2];
      if (seen.has(url)) continue;
      seen.add(url);
      items.push({ kind: "image", alt: m[1], url });
    }
    // Collect both `@youtube[ID]` placeholders and bare YouTube URLs.
    const ytRe = /@youtube\[([A-Za-z0-9_-]{11})\]/g;
    while ((m = ytRe.exec(md))) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({ kind: "video", videoId: id, raw: m[0], title: editing.title });
    }
    const bareRe =
      /(?:^|\s)(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})|youtu\.be\/([A-Za-z0-9_-]{11})))/g;
    while ((m = bareRe.exec(md))) {
      const id = m[2] || m[3];
      if (!id || seen.has(id)) continue;
      seen.add(id);
      items.push({ kind: "video", videoId: id, raw: m[1], title: editing.title });
    }
    if (!items.length) {
      toast("Bài chưa có ảnh hoặc video để chọn lại");
      return;
    }
    setReimageList(items);
  }

  async function openVideoPicker(replaceRaw: string, hintTitle?: string) {
    if (!editing) return;
    const seedQuery = (hintTitle || editing.title).trim();
    setVideoPicker({ replaceRaw, query: seedQuery });
    setVideoResults([]);
    setVideoErr("");
    setVideoLoading(true);
    try {
      const r = await fetch("/api/blog/youtube-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: seedQuery, limit: 12 }),
      });
      const j = await r.json();
      if (!r.ok) {
        setVideoErr(j?.error || `Lỗi ${r.status}`);
        return;
      }
      setVideoResults(j.videos || []);
    } catch (e: any) {
      setVideoErr(e?.message || "Lỗi");
    } finally {
      setVideoLoading(false);
    }
  }

  async function runVideoSearch(q: string) {
    if (!q.trim()) return;
    setVideoLoading(true);
    setVideoErr("");
    try {
      const r = await fetch("/api/blog/youtube-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.trim(), limit: 12 }),
      });
      const j = await r.json();
      if (!r.ok) {
        setVideoErr(j?.error || `Lỗi ${r.status}`);
        return;
      }
      setVideoResults(j.videos || []);
    } catch (e: any) {
      setVideoErr(e?.message || "Lỗi");
    } finally {
      setVideoLoading(false);
    }
  }

  function applyVideoPick(id: string) {
    if (!videoPicker || !editing) return;
    const next = `@youtube[${id}]`;
    const oldRaw = videoPicker.replaceRaw;
    const escaped = oldRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    setEditing((cur) => (cur ? { ...cur, markdown: cur.markdown.replace(new RegExp(escaped, "g"), next) } : cur));
    toast("Đã thay video");
    setVideoPicker(null);
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
      const next: EditingState = {
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
      };
      setEditing(next);
      setEditingOriginal(next);
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
      setEditingOriginal(editing);
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

  function renderPinnedStrip() {
    const mode: BlogPinMode = pinConfig.mode;
    const effectivePinned =
      mode === "manual"
        ? posts.filter((x) => x.pinned)
        : resolvePinnedPosts(posts, pinConfig, popularity);
    const canAdd = mode === "manual" && effectivePinned.length < MAX_PINNED;
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
    const activeCats = cats.filter((c) => c.active);
    const MODE_OPTIONS: { id: BlogPinMode; label: string; desc: string }[] = [
      { id: "manual", label: "Thủ công", desc: "Admin tự chọn 6 bài để ghim" },
      { id: "auto", label: "Tự động", desc: "Bài mới và/hoặc có nhiều lượt đánh giá hữu ích" },
      { id: "category", label: "Theo danh mục", desc: "6 bài mới nhất thuộc 1 danh mục" },
      { id: "random", label: "Ngẫu nhiên", desc: "Chọn ngẫu nhiên 6 bài đã phát hành" },
    ];
    return (
      <div className="bga-pinned-strip">
        <div className="bga-pinned-head">
          <IconPinFilled size={13} stroke={2} />
          <span>
            Ghim ({effectivePinned.length}/{MAX_PINNED})
          </span>
          <div className="bga-pinned-modes" role="tablist" aria-label="Chế độ ghim">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={mode === opt.id}
                className={`bga-pinned-mode${mode === opt.id ? " is-active" : ""}`}
                disabled={pinConfigSaving || mode === opt.id}
                onClick={() => {
                  if (opt.id === "category") {
                    const cat = pinConfig.category || activeCats[0]?.slug;
                    if (!cat) {
                      toast("Chưa có danh mục nào đang bật");
                      return;
                    }
                    void savePinConfig({ mode: "category", category: cat });
                  } else {
                    void savePinConfig({ mode: opt.id });
                  }
                }}
                title={opt.desc}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
        {mode === "category" && (
          <div className="bga-pinned-sub">
            <span className="bga-pinned-sub-label">Danh mục:</span>
            <Select
              selectSize="sm"
              value={pinConfig.category || ""}
              disabled={pinConfigSaving}
              placeholder={!pinConfig.category ? "— chọn —" : undefined}
              options={activeCats.map((c) => ({ value: c.slug, label: c.label }))}
              onChange={(e) => {
                const next = e.target.value;
                if (next) void savePinConfig({ mode: "category", category: next });
              }}
            />
            <span className="bga-pinned-sub-hint">6 bài phát hành mới nhất trong danh mục này.</span>
          </div>
        )}
        {mode === "auto" && (
          <div className="bga-pinned-sub">
            <span className="bga-pinned-sub-hint">
              Hệ thống tự chọn: ưu tiên bài đăng trong 14 ngày gần đây và/hoặc có nhiều lượt &quot;hữu ích&quot;.
            </span>
          </div>
        )}
        {mode === "random" && (
          <div className="bga-pinned-sub">
            <span className="bga-pinned-sub-hint">
              Chọn ngẫu nhiên {MAX_PINNED} bài trong tất cả bài đã phát hành; danh sách đổi mỗi lần render.
            </span>
          </div>
        )}
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
        {effectivePinned.length === 0 ? (
          <div className="bga-pinned-empty">
            {mode === "manual"
              ? 'Chưa có bài nào được ghim. Bấm "Chọn bài" để thêm.'
              : mode === "category"
              ? "Chưa có bài phát hành nào trong danh mục này."
              : mode === "random"
              ? "Chưa có bài phát hành nào để chọn ngẫu nhiên."
              : "Chưa đủ dữ liệu để chọn tự động."}
          </div>
        ) : (
          <div className="bga-pinned-list">
            {effectivePinned.map((p) => (
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
                <button className="bga-pinned-title" onClick={() => startEdit(p)} title="Sửa" type="button">
                  <span>{p.title}</span>
                </button>
                {mode === "manual" ? (
                  <button
                    className="fx-btn fx-btn-icon"
                    onClick={() => togglePin(p)}
                    title="Bỏ ghim"
                    style={{ color: "var(--warn, #f59e0b)" }}
                    type="button"
                  >
                    <IconPinFilled size={13} stroke={2} />
                  </button>
                ) : (
                  <span
                    className="fx-btn fx-btn-icon"
                    title={
                      mode === "auto"
                        ? "Hệ thống tự chọn"
                        : mode === "random"
                        ? "Ngẫu nhiên"
                        : "Theo danh mục"
                    }
                    aria-hidden="true"
                    style={{ color: "var(--dim)", pointerEvents: "none" }}
                  >
                    <IconPinFilled size={13} stroke={2} />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
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
        tab === "posts" ? (
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
        ) : tab === "categories" ? (
          <div className="fx-stat">
            <span className="fx-stat-ico">
              <IconCategory size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{cats.length}</span>
              <span className="fx-stat-lbl">Danh mục</span>
            </span>
          </div>
        ) : tab === "series" ? (
          <div className="fx-stat">
            <span className="fx-stat-ico">
              <IconListNumbers size={18} stroke={1.9} />
            </span>
            <span className="fx-stat-txt">
              <span className="fx-stat-val">{seriesGroups.length}</span>
              <span className="fx-stat-lbl">Series</span>
            </span>
          </div>
        ) : tab === "knowledge" ? (
          <>
            <div className="fx-stat">
              <span className="fx-stat-ico">
                <IconBulb size={18} stroke={1.9} />
              </span>
              <span className="fx-stat-txt">
                <span className="fx-stat-val">{dyk.length}</span>
                <span className="fx-stat-lbl">Kiến thức</span>
              </span>
            </div>
            <div className="fx-stat" data-tone="ok">
              <span className="fx-stat-ico">
                <IconCircleDashedCheck size={18} stroke={1.9} />
              </span>
              <span className="fx-stat-txt">
                <span className="fx-stat-val">{dyk.filter((d) => d.active).length}</span>
                <span className="fx-stat-lbl">Đang bật</span>
              </span>
            </div>
          </>
        ) : null
      }
    >
      <div
        className="bga-top-toolbar"
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
          className="bga-top-tabs"
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
          <button
            type="button"
            onClick={() => setTab("series")}
            className={`fx-btn ${tab === "series" ? "fx-btn-primary" : "fx-btn-ghost"}`}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            <IconListNumbers size={13} stroke={1.9} /> Series
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
        <div className="bga-top-actions">
          {tab === "posts" ? (
            <div className="bga-top-actions-posts" style={{ display: "flex", gap: 6 }}>
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
          ) : tab === "series" ? (
            <button onClick={() => openSeriesEditor(null)} className="fx-btn fx-btn-primary">
              <IconPlus size={14} stroke={2.2} /> Thêm series
            </button>
          ) : tab === "knowledge" ? (
            <>
              {isSuperAdmin && dykMissingQuiz.length > 0 && (
                <Button variant="ghost" size="sm" loading={!!dykQuizProgress} onClick={backfillDykQuiz}>
                  {dykQuizProgress ? `Đang sinh quiz ${dykQuizProgress}` : `Sinh quiz còn thiếu (${dykMissingQuiz.length})`}
                </Button>
              )}
              <button onClick={() => setDykChooserOpen(true)} className="fx-btn fx-btn-primary">
                <IconPlus size={14} stroke={2.2} /> Thêm kiến thức
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Failed-draft recovery banner — persisted across reloads so the user
          can retry generation after a crash or page refresh. */}
      {tab === "posts" && isSuperAdmin && batchFailed.length > 0 && (
        <div className="bga-failed-banner" role="status">
          <div className="bga-failed-banner-head">
            <span className="bga-failed-banner-ic">
              <IconAlertTriangle size={16} stroke={2} />
            </span>
            <div className="bga-failed-banner-text">
              <b>{batchFailed.length} bài sinh lỗi chưa xong</b>
              <span>Đã lưu lại, có thể thử sinh lại sau khi reload.</span>
            </div>
            <div className="bga-failed-banner-actions">
              <button
                type="button"
                className="fx-btn fx-btn-primary"
                onClick={() => {
                  const retryItems = batchFailed.map(({ title, angle }) => ({ title, angle }));
                  setBatchFailed([]);
                  setGenSteps({});
                  setGenErr("");
                  setGenAborted(false);
                  setGenerateOpen(true);
                  generateBatch(retryItems);
                }}
              >
                <IconRotateClockwise size={13} /> Thử lại tất cả
              </button>
              <button
                type="button"
                className="fx-btn"
                onClick={() => setGenerateOpen(true)}
                title="Mở trình sinh để xem và chỉnh"
              >
                Xem chi tiết
              </button>
              <button
                type="button"
                className="fx-btn fx-btn-ghost"
                onClick={() => {
                  if (confirm(`Xoá ${batchFailed.length} bài lỗi khỏi danh sách?`)) {
                    setBatchFailed([]);
                  }
                }}
                title="Xoá danh sách lỗi"
              >
                <IconX size={13} stroke={2} />
              </button>
            </div>
          </div>
          <ul className="bga-failed-banner-list">
            {batchFailed.slice(0, 5).map((f) => (
              <li key={f.title}>
                <b>{f.title}</b>
                {f.error ? <span className="bga-failed-banner-err"> — {f.error}</span> : null}
              </li>
            ))}
            {batchFailed.length > 5 && <li className="bga-failed-banner-more">+{batchFailed.length - 5} bài khác…</li>}
          </ul>
        </div>
      )}

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
                    {!it.quiz?.length && (
                      <span className="fx-badge" data-tone="mute">
                        Chưa có quiz
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
      ) : tab === "series" ? (
        seriesLoading && seriesGroups.length === 0 ? (
          <div className="fx-empty">
            <div className="fx-empty-ico">
              <IconLoader2 size={22} stroke={1.7} className="bga-spin" />
            </div>
            Đang tải series…
          </div>
        ) : seriesGroups.length === 0 ? (
          <div className="fx-empty">
            <div className="fx-empty-ico">
              <IconListNumbers size={22} stroke={1.7} />
            </div>
            Chưa có series nào. Bấm &quot;Thêm series&quot; để tạo mới.
          </div>
        ) : (
          <div className="fx-table">
            <div className="fx-row fx-row-head" style={{ gridTemplateColumns: "1fr 180px 80px 140px" }}>
              <div>Series</div>
              <div>Slug</div>
              <div style={{ textAlign: "center" }}>Phần</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>
            {seriesGroups.map((g) => {
              const publishedCount = g.parts.filter((p) => p.status === "published").length;
              const allPublic = publishedCount === g.parts.length;
              return (
                <div key={g.slug} className="fx-row" style={{ gridTemplateColumns: "1fr 180px 80px 140px" }}>
                  <div className="fx-title-cell">
                    <div className="fx-t-row">
                      <b>{g.label}</b>
                      {!allPublic && (
                        <span className="fx-badge" data-tone="mute" title="Public /blog chỉ hiện các phần đã Phát hành">
                          {publishedCount}/{g.parts.length} phát hành
                        </span>
                      )}
                    </div>
                    <span className="fx-t-sub">
                      {g.parts
                        .slice(0, 3)
                        .map((p) => p.title)
                        .join(" · ")}
                      {g.parts.length > 3 ? ` · +${g.parts.length - 3} khác` : ""}
                    </span>
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)" }}>series/{g.slug}</div>
                  <div style={{ textAlign: "center", fontSize: 12, color: "var(--dim)" }}>{g.parts.length}</div>
                  <div className="fx-row-actions">
                    <a
                      className="fx-btn fx-btn-icon"
                      href={`/blog/series/${encodeURIComponent(g.slug)}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Xem trang series"
                    >
                      <IconExternalLink size={14} stroke={1.9} />
                    </a>
                    <button className="fx-btn fx-btn-icon" onClick={() => openSeriesEditor(g)} title="Sửa">
                      <IconEdit size={14} stroke={1.9} />
                    </button>
                    <button
                      className="fx-btn fx-btn-icon fx-btn-danger"
                      onClick={() => deleteSeries(g)}
                      title="Gỡ series"
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
          <div className="bga-pinned-inline-only">{renderPinnedStrip()}</div>
          {autoRunning && (
            <div
              className="bga-failed-banner"
              role="status"
              style={{
                borderColor: autoStalled ? "var(--warn, #f59e0b)" : "var(--accent, #6366f1)",
                background: `color-mix(in oklab, ${autoStalled ? "var(--warn, #f59e0b)" : "var(--accent, #6366f1)"} 8%, transparent)`,
                cursor: "pointer",
              }}
              onClick={() => setAutoProgressOpen(true)}
              title="Xem chi tiết tiến trình"
            >
              <div className="bga-failed-banner-head">
                <span className="bga-failed-banner-ic">
                  {autoStalled ? (
                    <IconAlertTriangle size={16} stroke={2} style={{ color: "var(--warn, #f59e0b)" }} />
                  ) : (
                    <IconLoader2 size={16} stroke={2} className="bga-spin" />
                  )}
                </span>
                <div className="bga-failed-banner-text">
                  <b>
                    Sinh tự động đang chạy · {autoGenerated}
                    {autoStatus.unlimited ? "" : `/${autoStatus.targetCount}`} bài
                  </b>
                  <span>
                    {autoStalled ? "Cron không phản hồi, bấm để xem chi tiết" : autoCurrentTopic || "Đang khởi động…"}
                    {autoFailed ? ` · lỗi ${autoFailed}` : ""}
                  </span>
                </div>
                <div className="bga-failed-banner-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="fx-btn" onClick={() => setAutoProgressOpen(true)}>
                    Chi tiết
                  </button>
                  <button
                    type="button"
                    className="fx-btn"
                    onClick={stopAutoMode}
                    style={{ color: "var(--err, #ef4444)" }}
                  >
                    <IconX size={13} /> Dừng
                  </button>
                </div>
              </div>
            </div>
          )}
          {isSuperAdmin && selectedDraftSlugs.size > 0 && (
            <div className="bga-failed-banner" role="status" style={{ borderColor: "var(--ok, #10b981)" }}>
              <div className="bga-failed-banner-head">
                <span className="bga-failed-banner-ic" style={{ color: "var(--ok, #10b981)" }}>
                  <IconCircleCheckFilled size={16} stroke={2} />
                </span>
                <div className="bga-failed-banner-text">
                  <b>Đã chọn {selectedDraftSlugs.size} bài nháp</b>
                  <span>Duyệt hàng loạt hoặc bỏ chọn.</span>
                </div>
                <div className="bga-failed-banner-actions">
                  <button
                    type="button"
                    className="fx-btn fx-btn-primary"
                    onClick={bulkApprove}
                    disabled={bulkApproving}
                    style={{ color: "#fff", background: "var(--ok, #10b981)" }}
                  >
                    <IconCheck size={13} /> {bulkApproving ? "Đang duyệt…" : `Duyệt ${selectedDraftSlugs.size} bài`}
                  </button>
                  <button
                    type="button"
                    className="fx-btn fx-btn-ghost"
                    onClick={() => setSelectedDraftSlugs(new Set())}
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            </div>
          )}
          {visible.length === 0 ? (
            <div className="fx-empty">
              <div className="fx-empty-ico">
                <IconArticle size={22} stroke={1.7} />
              </div>
              {posts.length === 0 ? 'Chưa có bài. Bấm "Sinh bài" để tạo bài AI đầu tiên.' : "Không có kết quả phù hợp."}
            </div>
          ) : (
            <div className="fx-table">
              <div
                className="fx-row fx-row-head"
                style={{ gridTemplateColumns: "32px 56px 1fr 100px 110px 100px 190px" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isSuperAdmin &&
                    (() => {
                      const draftSlugs = visible
                        .filter((p) => (p.status || "published") === "draft")
                        .map((p) => p.slug);
                      const allChecked = draftSlugs.length > 0 && draftSlugs.every((s) => selectedDraftSlugs.has(s));
                      const someChecked = draftSlugs.some((s) => selectedDraftSlugs.has(s));
                      return (
                        <input
                          type="checkbox"
                          aria-label="Chọn tất cả bài nháp"
                          disabled={draftSlugs.length === 0}
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = !allChecked && someChecked;
                          }}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedDraftSlugs(new Set(draftSlugs));
                            else setSelectedDraftSlugs(new Set());
                          }}
                        />
                      );
                    })()}
                </div>
                <div>Ảnh</div>
                <div>Bài viết</div>
                <div>Danh mục</div>
                <div>Trạng thái</div>
                <div>Ngày</div>
                <div style={{ textAlign: "right" }}>Actions</div>
              </div>
              {visible.map((p) => {
                const status = (p.status || "published") as BlogStatus;
                return (
                  <div
                    key={p.slug}
                    className="fx-row blog-row"
                    style={{ gridTemplateColumns: "32px 56px 1fr 100px 110px 100px 190px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isSuperAdmin && status === "draft" && (
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${p.title}`}
                          checked={selectedDraftSlugs.has(p.slug)}
                          onChange={() => toggleDraftSelected(p.slug)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
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

      {/* AUTO PROGRESS MODAL */}
      {isSuperAdmin && autoProgressOpen && (
        <div
          className="fx-modal-bg fx-modal-sheet"
          style={{ zIndex: 200 }}
          onClick={(e) => e.target === e.currentTarget && setAutoProgressOpen(false)}
        >
          <div className="fx-modal" style={{ maxWidth: 560, width: "94vw" }}>
            <div className="fx-modal-head">
              <h2>
                <IconLoader2 size={16} stroke={2} className={autoRunning ? "bga-spin" : ""} /> Tiến trình sinh tự động
                <span className="fx-badge" data-tone={autoRunning ? "ok" : "mute"}>
                  {autoRunning ? "ĐANG CHẠY" : "DỪNG"}
                </span>
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => setAutoProgressOpen(false)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Đã sinh", value: String(autoGenerated), color: "var(--ok, #10b981)" },
                  {
                    label: autoStatus.unlimited ? "Mục tiêu" : "Còn lại",
                    value: autoStatus.unlimited ? "∞" : String(Math.max(0, autoStatus.targetCount - autoGenerated)),
                    color: "var(--text)",
                  },
                  {
                    label: "Lỗi",
                    value: String(autoFailed),
                    color: autoFailed ? "var(--err, #ef4444)" : "var(--dim, #94a3b8)",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--bg2)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.3 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg2)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <div style={{ color: "var(--dim, #94a3b8)", fontSize: 11, marginBottom: 4 }}>Đang xử lý</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {autoRunning && <IconLoader2 size={14} className="bga-spin" />}
                  <b>{autoCurrentTopic || (autoRunning ? "Đang khởi động…" : "Đã dừng")}</b>
                </div>
                {autoStalled && (
                  <div style={{ marginTop: 6, color: "var(--warn, #f59e0b)", fontSize: 12 }}>
                    <IconAlertTriangle size={12} stroke={2} style={{ verticalAlign: "-2px" }} /> Hơn 3 phút chưa có lượt
                    cron nào chạy. Kiểm tra lịch blog-auto-tick trên Supabase và secret blog_auto_cron_secret trong Vault
                    có khớp CRON_SECRET trên Vercel không.
                  </div>
                )}
                {autoStatus.lastError && (
                  <div style={{ marginTop: 6, color: "var(--err, #ef4444)", fontSize: 12 }}>
                    <IconAlertTriangle size={12} stroke={2} style={{ verticalAlign: "-2px" }} /> Lỗi gần nhất:{" "}
                    {autoStatus.lastError}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 6 }}>
                  Bài vừa sinh ({autoStatus.recent.length})
                </div>
                {autoStatus.recent.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--dim)" }}>Chưa có bài nào.</div>
                ) : (
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {autoStatus.recent.map((r) => (
                      <li key={r.slug} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                        <IconCircleCheckFilled size={12} style={{ color: "var(--ok, #10b981)", flexShrink: 0 }} />
                        <Link
                          href={`/blog/${r.slug}`}
                          target="_blank"
                          style={{
                            color: "var(--text)",
                            textDecoration: "none",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.title}
                        </Link>
                        <span style={{ fontSize: 11, color: "var(--dim)" }}>{new Date(r.at).toLocaleTimeString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.5 }}>
                Vòng lặp chạy trên server — bạn có thể đóng tab/trình duyệt, bài vẫn tiếp tục sinh. Mở lại trang này để
                xem tiếp. Nếu server khởi động lại thì phải bấm chạy lại.
              </div>
            </div>
            <div className="fx-modal-foot">
              <button className="fx-btn" onClick={() => setAutoProgressOpen(false)}>
                Đóng
              </button>
              {autoRunning && (
                <>
                  <button
                    className="fx-btn"
                    onClick={() => fireAutoTick(true)}
                    title="Chạy ngay 1 lượt sinh thay vì đợi cron (hữu ích khi dev local)"
                  >
                    <IconPlayerSkipForward size={14} stroke={2} /> Tick ngay
                  </button>
                  <button className="fx-btn" style={{ color: "var(--err, #ef4444)" }} onClick={stopAutoMode}>
                    <IconX size={14} stroke={2} /> Dừng tự động
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PIN MODAL */}
      {pinModalOpen && (
        <div
          className="fx-modal-bg fx-modal-sheet"
          onClick={(e) => e.target === e.currentTarget && setPinModalOpen(false)}
        >
          <div
            className="fx-modal"
            style={{ maxWidth: 1100, width: "95vw", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
          >
            <div className="fx-modal-head">
              <h2>
                <IconPinFilled size={16} stroke={2} /> Cấu hình ghim
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => setPinModalOpen(false)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body" style={{ overflow: "auto" }}>
              {renderPinnedStrip()}
            </div>
          </div>
        </div>
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
        <div className="fx-modal-bg fx-modal-sheet" style={{ zIndex: 200 }}>
          <div className="fx-modal" style={{ maxWidth: 880, width: "96vw" }}>
            <div className="fx-modal-head">
              <h2>
                <IconSparkles size={16} stroke={2} /> Sinh bài blog
                <span className="fx-badge">AI</span>
              </h2>
              {!genLoading && !batchRunning && (
                <div className="bga-seg bga-gen-modes" role="group" aria-label="Chế độ sinh bài">
                  <button
                    type="button"
                    className={showAutoMode ? "" : "is-on"}
                    aria-pressed={!showAutoMode}
                    onClick={() => setGenMode("config")}
                  >
                    <IconAdjustmentsHorizontal size={13} stroke={2} /> Cấu hình
                  </button>
                  <button
                    type="button"
                    className={showAutoMode ? "is-on" : ""}
                    aria-pressed={showAutoMode}
                    onClick={() => setGenMode("auto")}
                  >
                    <IconRotateClockwise size={13} stroke={2} /> Tự động
                  </button>
                </div>
              )}
              <button
                className="fx-btn fx-btn-icon fx-btn-ghost"
                onClick={() => {
                  if (genLoading || batchRunning) return;
                  setGenerateOpen(false);
                  setSkipTopicAutoFocus(false);
                }}
                disabled={genLoading || batchRunning}
                title={genLoading || batchRunning ? "Đang sinh bài — không thể đóng" : "Đóng"}
              >
                <IconX size={16} stroke={2} />
              </button>
            </div>
            {showAutoMode ? (
              <AutoModePanel
                onClose={() => setGenerateOpen(false)}
                onEditConfig={() => setGenMode("config")}
                running={autoRunning}
                categoryLabel={CAT_LABEL[genCategory] || genCategory}
                inherited={[
                  { label: "Danh mục", value: CAT_LABEL[genCategory] || genCategory },
                  {
                    label: "Model",
                    value:
                      AI_MODELS[genProvider].find((m) => m.id === genModel.split("|")[1])?.label ||
                      AI_PROVIDER_LABEL[genProvider],
                  },
                  {
                    label: "Cấu trúc",
                    value: GEN_STRUCTURES.find((s) => s.id === genStructure)?.label || genStructure,
                  },
                  { label: "Giọng văn", value: GEN_TONES.find((x) => x.id === genTone)?.label || genTone },
                  { label: "Độ dài", value: GEN_LENGTHS.find((l) => l.id === genLength)?.label || genLength },
                  { label: "Độc giả", value: GEN_AUDIENCES.find((a) => a.id === genAudience)?.label || genAudience },
                  { label: "Vùng", value: GEN_REGIONS.find((r) => r.id === genRegion)?.label || genRegion },
                  { label: "Số ảnh", value: String(genImages) },
                  { label: "Thành phần", value: `${genExtras.length} mục` },
                  { label: "Tra cứu web", value: genResearch ? "Bật" : "Tắt" },
                  { label: "Kiểm chứng", value: genFactCheck ? "Bật" : "Tắt" },
                  { label: "Video", value: genIncludeVideo ? "Bật" : "Tắt" },
                ]}
                onStart={startAutoMode}
              />
            ) : (
              <>
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

                          {batchRunning && batchQueue.length > 0 && (
                            <div className="bga-queue">
                              <div className="bga-queue-head">
                                <IconSparkles size={13} stroke={2} />
                                <span>Hàng chờ sinh bài</span>
                                <span className="bga-queue-count">{batchQueue.length} bài chờ</span>
                                {batchEtaSec != null && batchEtaSec > 0 && (
                                  <span className="bga-queue-count" title="Thời gian dự kiến còn lại">
                                    <IconClock size={11} stroke={2} />{" "}
                                    {batchEtaSec >= 60 ? `~${Math.round(batchEtaSec / 60)} phút` : `~${batchEtaSec}s`}
                                  </span>
                                )}
                              </div>
                              <ol className="bga-queue-list">
                                {batchCurrent && (
                                  <li className="bga-queue-item is-current">
                                    <span className="bga-queue-pos">
                                      <IconLoader2 size={12} className="spin" />
                                    </span>
                                    <div className="bga-queue-body">
                                      <b>{batchCurrent.title}</b>
                                      {batchCurrent.angle && <span>{batchCurrent.angle}</span>}
                                    </div>
                                    <span className="bga-queue-tag">Đang sinh</span>
                                  </li>
                                )}
                                {batchQueue.map((item, i) => (
                                  <li key={`${item.title}::${i}`} className="bga-queue-item">
                                    <span className="bga-queue-pos">{i + 2}</span>
                                    <div className="bga-queue-body">
                                      <b>{item.title}</b>
                                      {item.angle && <span>{item.angle}</span>}
                                    </div>
                                    <div className="bga-queue-actions">
                                      <button
                                        type="button"
                                        className="bga-queue-btn"
                                        disabled={i === 0}
                                        onClick={() => {
                                          const next = [...queueRef.current];
                                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                                          updateQueue(next);
                                        }}
                                        title="Lên 1 bậc"
                                        aria-label="Lên"
                                      >
                                        <IconArrowUp size={12} stroke={2.2} />
                                      </button>
                                      <button
                                        type="button"
                                        className="bga-queue-btn"
                                        disabled={i === batchQueue.length - 1}
                                        onClick={() => {
                                          const next = [...queueRef.current];
                                          [next[i + 1], next[i]] = [next[i], next[i + 1]];
                                          updateQueue(next);
                                        }}
                                        title="Xuống 1 bậc"
                                        aria-label="Xuống"
                                      >
                                        <IconArrowDown size={12} stroke={2.2} />
                                      </button>
                                      <button
                                        type="button"
                                        className="bga-queue-btn bga-queue-btn-del"
                                        onClick={() => {
                                          const next = queueRef.current.filter((_, j) => j !== i);
                                          updateQueue(next);
                                          // Shrink total so progress reflects reality.
                                          setBatchTotal((prev) => Math.max(batchIdx, prev - 1));
                                        }}
                                        title="Bỏ bài này khỏi hàng chờ"
                                        aria-label="Xoá"
                                      >
                                        <IconX size={12} stroke={2.4} />
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

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
                            autoFocus={!skipTopicAutoFocus}
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
                                    <button
                                      type="button"
                                      className="bga-ideas-clear"
                                      onClick={() => setSelectedIdeas({})}
                                    >
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
                              <IconLink size={13} stroke={1.9} /> Công cụ
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
                                  <Field label="Từ khoá liên quan (Cách bằng dấu phẩy)">
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
                                  <label
                                    className="bga-toggle-card"
                                    title="Chèn meta description 150-160 ký tự tối ưu CTR"
                                  >
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
                                    <Switch
                                      checked={genSchemaHint}
                                      onChange={(e) => setGenSchemaHint(e.target.checked)}
                                    />
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
                                          setGenLength("medium");
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
                                  <Field
                                    label={
                                      <>
                                        <IconRuler size={11} stroke={1.9} /> Độ dài
                                      </>
                                    }
                                  >
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
                                      {[0, 2, 4, 6, 8, 10].map((n) => (
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
                                  <label
                                    className="bga-toggle-card"
                                    title="Diễn giải lại thay vì copy nguyên văn nguồn"
                                  >
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
                                  <label
                                    className="bga-toggle-card"
                                    title="Tra cứu web trước khi viết để có dữ kiện mới"
                                  >
                                    <Switch checked={genResearch} onChange={(e) => setGenResearch(e.target.checked)} />
                                    <div className="bga-toggle-text">
                                      <b>
                                        <IconWorldSearch size={12} stroke={1.9} /> Tra cứu web
                                      </b>
                                      <span>Dữ kiện mới, kèm nguồn tham khảo</span>
                                    </div>
                                  </label>
                                  <label
                                    className="bga-toggle-card"
                                    title="AI thứ hai rà lại bài, bỏ/làm mềm câu nghi bịa"
                                  >
                                    <Switch
                                      checked={genFactCheck}
                                      onChange={(e) => setGenFactCheck(e.target.checked)}
                                    />
                                    <div className="bga-toggle-text">
                                      <b>
                                        <IconCircleCheckFilled size={12} /> Kiểm chứng dữ kiện
                                      </b>
                                      <span>Pass 2: bắt hallucination (chậm hơn ~15s)</span>
                                    </div>
                                  </label>
                                  <label
                                    className="bga-toggle-card"
                                    title="Tìm video thật liên quan tới chủ đề, nhúng sau phần mở bài"
                                  >
                                    <Switch
                                      checked={genIncludeVideo}
                                      onChange={(e) => setGenIncludeVideo(e.target.checked)}
                                    />
                                    <div className="bga-toggle-text">
                                      <b>
                                        <IconBrandYoutube size={12} stroke={1.9} /> Video YouTube
                                      </b>
                                      <span>
                                        {genIncludeVideo ? "Chèn 1 video sau mở bài" : "Bài chỉ gồm chữ + ảnh"}
                                      </span>
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
                        title={
                          !topic.trim() && selectedCount === 0 ? "Nhập chủ đề hoặc chọn ít nhất 1 gợi ý" : undefined
                        }
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
              </>
            )}
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
                      title="Chọn ảnh hoặc video trong bài để thay thế"
                    >
                      <IconPhotoSearch size={14} /> AI Ảnh/Video
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
                  {isSuperAdmin && !editDirty && editing.status === "draft" && (
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
                  {isSuperAdmin && !editDirty && (editing.status === "draft" || editing.status === "rejected") && (
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
                  {editDirty ? (
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
                  ) : (
                    <button className="fx-btn" onClick={() => setEditing(null)} disabled={saving}>
                      Đóng
                    </button>
                  )}
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
                <IconPhotoSearch size={16} stroke={2} /> Ảnh &amp; video trong bài — chọn mục để thay thế
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => setReimageList(null)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body">
              <div className="bga-picker-grid">
                {reimageList.map((it) =>
                  it.kind === "image" ? (
                    <button
                      key={`img-${it.url}`}
                      type="button"
                      className="bga-picker-item"
                      onClick={() => {
                        setReimageList(null);
                        setPicker({
                          target: "replace",
                          query: photoQuery(
                            it.alt || editing.title,
                            editing.tags
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                          ),
                          replaceUrl: it.url,
                        });
                      }}
                      title={it.alt}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.url} alt={it.alt} loading="lazy" referrerPolicy="no-referrer" />
                      <span>{it.alt || "(không có mô tả)"}</span>
                    </button>
                  ) : (
                    <button
                      key={`vid-${it.videoId}`}
                      type="button"
                      className="bga-picker-item"
                      onClick={() => {
                        setReimageList(null);
                        openVideoPicker(it.raw, it.title);
                      }}
                      title={`YouTube · ${it.videoId}`}
                      style={{ position: "relative" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://i.ytimg.com/vi/${it.videoId}/hqdefault.jpg`}
                        alt="YouTube video"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: 6,
                          left: 6,
                          background: "rgba(220,38,38,0.9)",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <IconBrandYoutube size={11} stroke={2.4} /> VIDEO
                      </span>
                      <span>Đổi video khác</span>
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {videoPicker && editing && (
        <div className="fx-modal-bg" style={{ zIndex: 260 }} onClick={() => setVideoPicker(null)}>
          <div className="fx-modal" style={{ maxWidth: 860, width: "95vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="fx-modal-head">
              <h2>
                <IconBrandYoutube size={16} stroke={2} /> Chọn video YouTube khác
              </h2>
              <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => setVideoPicker(null)}>
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <Input
                  value={videoPicker.query}
                  onChange={(e) => setVideoPicker({ ...videoPicker, query: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runVideoSearch(videoPicker.query);
                  }}
                  placeholder="Từ khoá tìm video…"
                />
                <button
                  type="button"
                  className="fx-btn fx-btn-primary"
                  onClick={() => runVideoSearch(videoPicker.query)}
                  disabled={videoLoading}
                >
                  <IconSearch size={14} stroke={2} /> {videoLoading ? "Đang tìm…" : "Tìm"}
                </button>
              </div>
              {videoErr && (
                <div className="fx-err" style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <IconAlertTriangle size={13} /> {videoErr}
                </div>
              )}
              {videoLoading && !videoResults.length ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--dim)" }}>
                  <IconLoader2 size={18} className="fx-spin" /> Đang tìm video…
                </div>
              ) : (
                <div className="bga-picker-grid">
                  {videoResults.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className="bga-picker-item"
                      onClick={() => applyVideoPick(v.id)}
                      title={v.title}
                      style={{ position: "relative" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.thumb} alt={v.title} loading="lazy" referrerPolicy="no-referrer" />
                      {v.duration && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: 28,
                            right: 6,
                            background: "rgba(0,0,0,0.78)",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 5px",
                            borderRadius: 3,
                          }}
                        >
                          {v.duration}
                        </span>
                      )}
                      <span style={{ display: "block", textAlign: "left" }}>
                        <b style={{ display: "block", lineHeight: 1.3, fontSize: 12 }}>{v.title}</b>
                        {v.channel && <span style={{ color: "var(--dim)", fontSize: 11 }}>{v.channel}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!videoLoading && !videoResults.length && !videoErr && (
                <div style={{ textAlign: "center", padding: 20, color: "var(--dim)" }}>
                  Không có kết quả. Thử từ khoá khác.
                </div>
              )}
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

      {/* SERIES EDIT MODAL — dual pane picker: left = all posts (search), right = ordered selection */}
      {seriesEditor && (
        <div className="fx-modal-bg" style={{ zIndex: 200 }}>
          <div className="fx-modal bga-series-modal">
            <div className="fx-modal-head">
              <h2>
                <IconListNumbers size={16} stroke={2} />{" "}
                {seriesEditor.original ? `Sửa series "${seriesEditor.original.label}"` : "Thêm series"}
              </h2>
              <button
                className="fx-btn fx-btn-icon fx-btn-ghost"
                onClick={() => !seriesSaving && setSeriesEditor(null)}
              >
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="fx-modal-body">
              <div className="bga-grid2">
                <Field
                  label="Tên Series"
                  required
                  hint={
                    seriesEditor.slug.trim()
                      ? `Hiển thị: ${seriesEditor.slug.trim()} · Slug: ${slugifyLabel(seriesEditor.slug.trim()) || "—"}`
                      : "Nhập tên có dấu; hệ thống lưu nguyên tên để hiển thị và slug (bỏ dấu) để URL."
                  }
                >
                  <Input
                    autoFocus
                    value={seriesEditor.slug}
                    disabled={seriesSaving}
                    onChange={(e) => setSeriesEditor((cur) => (cur ? { ...cur, slug: e.target.value } : cur))}
                    placeholder="vd: Next.js 14 từ đầu"
                  />
                </Field>
                <Field label="Số phần đã chọn">
                  <Input value={`${seriesEditor.slugs.length} bài`} disabled monospace />
                </Field>
              </div>

              <div className="bga-series-picker">
                {/* LEFT: all posts (search) */}
                <div className="bga-series-pane">
                  <div className="bga-series-pane-head">
                    <b>Thư viện bài viết</b>
                    <input
                      type="text"
                      value={seriesEditor.pickQ}
                      onChange={(e) => setSeriesEditor((cur) => (cur ? { ...cur, pickQ: e.target.value } : cur))}
                      placeholder="Tìm tiêu đề, slug…"
                      className="bga-pinned-picker-input"
                      style={{ marginLeft: "auto" }}
                    />
                  </div>
                  <div className="bga-series-list">
                    {(() => {
                      const q = seriesEditor.pickQ.trim().toLowerCase();
                      const selected = new Set(seriesEditor.slugs);
                      // Hide posts already assigned to another series — but keep
                      // the ones in this editor's own series so the admin can
                      // still see them while editing.
                      const ownSeriesSlug = seriesEditor.original?.slug ?? null;
                      const items = posts
                        .filter((p) => (p.status || "published") === "published")
                        .filter((p) => !selected.has(p.slug))
                        .filter((p) => {
                          const inSeries = (p.tags || []).find((t) => t.toLowerCase().startsWith("series/"));
                          if (!inSeries) return true;
                          const slug = inSeries.slice("series/".length).toLowerCase();
                          return ownSeriesSlug && slug === ownSeriesSlug.toLowerCase();
                        })
                        .filter((p) => {
                          if (!q) return true;
                          return (
                            p.title.toLowerCase().includes(q) ||
                            p.slug.toLowerCase().includes(q) ||
                            (p.excerpt || "").toLowerCase().includes(q)
                          );
                        })
                        .slice(0, 60);
                      if (items.length === 0)
                        return <div className="bga-pinned-picker-empty">Không có bài phù hợp</div>;
                      return items.map((p) => (
                        <button
                          key={p.slug}
                          type="button"
                          className="bga-series-item"
                          onClick={() => addSeriesSlug(p.slug)}
                          title="Thêm vào series"
                        >
                          <div className="bga-pinned-thumb">
                            {p.coverImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={rewriteImgUrl(p.coverImage.split("#")[0])}
                                alt=""
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span style={{ background: `linear-gradient(135deg, ${p.cover.from}, ${p.cover.to})` }} />
                            )}
                          </div>
                          <div className="bga-series-item-text">
                            <b>{p.title}</b>
                            <span>/blog/{p.slug}</span>
                          </div>
                          <IconPlus size={14} stroke={2} />
                        </button>
                      ));
                    })()}
                  </div>
                </div>

                {/* RIGHT: ordered selection */}
                <div className="bga-series-pane">
                  <div className="bga-series-pane-head">
                    <b>Thứ tự trong series</b>
                    <span style={{ marginLeft: "auto", color: "var(--dim)", fontSize: 12 }}>
                      Phần 1 → Phần {seriesEditor.slugs.length || "n"}
                    </span>
                  </div>
                  <div className="bga-series-list">
                    {seriesEditor.slugs.length === 0 ? (
                      <div className="bga-pinned-picker-empty">Chọn bài ở cột trái để thêm vào series.</div>
                    ) : (
                      seriesEditor.slugs.map((s, i) => {
                        const p = posts.find((x) => x.slug === s);
                        if (!p) return null;
                        return (
                          <div key={s} className="bga-series-item bga-series-item--picked">
                            <span className="bga-series-order">{i + 1}</span>
                            <div className="bga-pinned-thumb">
                              {p.coverImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={rewriteImgUrl(p.coverImage.split("#")[0])}
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
                            <div className="bga-series-item-text">
                              <b>{p.title}</b>
                              <span>/blog/{p.slug}</span>
                            </div>
                            <div className="bga-series-item-actions">
                              <button
                                type="button"
                                className="fx-btn fx-btn-icon fx-btn-ghost"
                                onClick={() => moveSeriesSlug(i, -1)}
                                disabled={i === 0}
                                title="Lên"
                              >
                                <IconArrowUp size={14} stroke={2} />
                              </button>
                              <button
                                type="button"
                                className="fx-btn fx-btn-icon fx-btn-ghost"
                                onClick={() => moveSeriesSlug(i, 1)}
                                disabled={i === seriesEditor.slugs.length - 1}
                                title="Xuống"
                              >
                                <IconArrowDown size={14} stroke={2} />
                              </button>
                              <button
                                type="button"
                                className="fx-btn fx-btn-icon fx-btn-danger"
                                onClick={() => removeSeriesSlug(s)}
                                title="Gỡ khỏi series"
                              >
                                <IconX size={14} stroke={2} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {seriesErr && <div className="fx-err">{seriesErr}</div>}
            </div>
            <div className="fx-modal-foot">
              <button className="fx-btn" onClick={() => setSeriesEditor(null)} disabled={seriesSaving}>
                Huỷ
              </button>
              <button
                className="fx-btn fx-btn-primary"
                onClick={saveSeries}
                disabled={seriesSaving || !seriesEditor.slug.trim() || seriesEditor.slugs.length < 2}
              >
                {seriesSaving ? (
                  <>
                    <IconLoader2 size={14} className="spin" /> Đang lưu…
                  </>
                ) : (
                  <>
                    <IconDeviceFloppy size={14} /> Lưu series
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
        @media (min-width: 761px) and (max-width: 1100px) {
          .fx-table:has(.blog-row) .fx-row {
            grid-template-columns: 28px 48px minmax(0, 1fr) 92px 96px 84px 76px !important;
            gap: 10px;
          }
          .blog-row .fx-title-cell .fx-t-href {
            display: none;
          }
        }
        @media (max-width: 760px) {
          .fx-table:has(.blog-row) .fx-row-head {
            display: none !important;
          }
          .fx-table:has(.blog-row) {
            overflow: visible !important;
            border: none;
            background: none;
            box-shadow: none;
          }
          .blog-row {
            min-width: 0 !important;
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 48px auto auto minmax(0, 1fr) !important;
            grid-template-areas:
              "ico title title title"
              "ico cat   stat  date"
              "act act   act   act" !important;
            gap: 6px 8px !important;
            padding: 10px !important;
            align-items: center !important;
            border-radius: 10px;
            border: 1px solid var(--border) !important;
            margin-bottom: 8px;
            background: var(--bg2, transparent);
          }
          .blog-row:last-child {
            margin-bottom: 0;
          }
          /* Bulk-select checkbox sits on the thumbnail so it costs no column. */
          .blog-row > div:nth-child(1) {
            grid-area: ico;
            align-self: start;
            justify-self: start;
            z-index: 1;
            margin: 3px;
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
            font-size: 14px !important;
            line-height: 1.35 !important;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            white-space: normal !important;
            overflow: hidden !important;
            min-width: 0;
          }
          .blog-row > div:nth-child(4) {
            grid-area: cat;
            justify-self: start;
          }
          .blog-row > div:nth-child(5) {
            grid-area: stat;
            justify-self: start;
          }
          .blog-row > div:nth-child(6) {
            grid-area: date;
            justify-self: end;
            font-size: 11px !important;
            white-space: nowrap;
          }
          .blog-row .fx-row-actions:empty {
            display: none !important;
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
