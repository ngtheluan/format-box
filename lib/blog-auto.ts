// Server-side continuous blog generator. State lives in this module's closure
// so the loop survives client disconnects (close tab, navigate away, close
// browser). It does NOT survive server restarts — on cold boot the job is
// "idle" and must be restarted by an admin.
//
// Internally the loop just calls POST /api/blog/generate with the admin's
// cookie forwarded from the request that started the job, so auth, drafting,
// image picking and DB insert reuse the existing pipeline unchanged.

export type AutoRecent = { title: string; slug: string; at: number };

export type AutoStatus = {
  running: boolean;
  category: string; // "random" or a category slug
  unlimited: boolean;
  targetCount: number; // 0 when unlimited
  generated: number;
  failed: number;
  currentTopic: string;
  startedAt: number | null;
  lastEventAt: number | null;
  recent: AutoRecent[];
  lastError?: string;
  provider?: string;
  model?: string;
};

type GlobalBag = {
  job: AutoStatus;
  abort: AbortController | null;
  loop: Promise<void> | null;
};

const g = globalThis as unknown as { __fbBlogAuto?: GlobalBag };
if (!g.__fbBlogAuto) {
  g.__fbBlogAuto = {
    job: freshJob(),
    abort: null,
    loop: null,
  };
}
const bag = g.__fbBlogAuto;

function freshJob(): AutoStatus {
  return {
    running: false,
    category: "random",
    unlimited: false,
    targetCount: 0,
    generated: 0,
    failed: 0,
    currentTopic: "",
    startedAt: null,
    lastEventAt: null,
    recent: [],
  };
}

export function getAutoStatus(): AutoStatus {
  return { ...bag.job, recent: bag.job.recent.slice(0, 10) };
}

export function isAutoRunning(): boolean {
  return bag.job.running;
}

export function stopAuto(): AutoStatus {
  bag.job.running = false;
  bag.abort?.abort();
  return getAutoStatus();
}

export type StartConfig = {
  category: string;
  unlimited: boolean;
  count: number;
  baseUrl: string;
  cookie?: string;
  provider?: string;
  model?: string;
};

export async function startAuto(cfg: StartConfig): Promise<AutoStatus> {
  if (bag.job.running) return getAutoStatus();
  bag.job = freshJob();
  bag.job.running = true;
  bag.job.category = cfg.category || "random";
  bag.job.unlimited = !!cfg.unlimited;
  bag.job.targetCount = cfg.unlimited ? 0 : Math.max(1, Math.floor(cfg.count));
  bag.job.startedAt = Date.now();
  bag.job.lastEventAt = Date.now();
  bag.job.provider = cfg.provider;
  bag.job.model = cfg.model;
  bag.loop = runLoop(cfg).catch((err) => {
    bag.job.lastError = String((err as Error)?.message || err);
    bag.job.running = false;
  });
  return getAutoStatus();
}

async function fetchActiveCategories(baseUrl: string, cookie?: string): Promise<string[]> {
  try {
    const r = await fetch(`${baseUrl}/api/blog/categories`, {
      cache: "no-store",
      headers: cookie ? { cookie } : {},
    });
    const j = await r.json().catch(() => null);
    const list = Array.isArray(j?.categories) ? j.categories : [];
    const slugs = list.filter((c: { active?: boolean }) => c.active).map((c: { slug: string }) => c.slug);
    return slugs.length ? slugs : list.map((c: { slug: string }) => c.slug);
  } catch {
    return [];
  }
}

async function runLoop(cfg: StartConfig) {
  const activeCats = await fetchActiveCategories(cfg.baseUrl, cfg.cookie);
  const pickCat = (): string => {
    if (cfg.category && cfg.category !== "random") return cfg.category;
    if (!activeCats.length) return "tech";
    return activeCats[Math.floor(Math.random() * activeCats.length)];
  };

  while (bag.job.running && (bag.job.unlimited || bag.job.generated < bag.job.targetCount)) {
    const catSlug = pickCat();
    bag.job.currentTopic = `${catSlug} · đang khởi động…`;
    bag.job.lastEventAt = Date.now();
    const ac = new AbortController();
    bag.abort = ac;
    try {
      const r = await fetch(`${cfg.baseUrl}/api/blog/generate`, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          ...(cfg.cookie ? { cookie: cfg.cookie } : {}),
        },
        body: JSON.stringify({
          mode: "random",
          provider: cfg.provider || "groq",
          model: cfg.model,
          category: catSlug,
          tone: "friendly",
          length: "medium",
          images: 4,
          research: true,
          notes: "",
          audience: "mixed",
          structure: "news",
          extras: ["tldr", "stats"],
          cta: "share",
          region: "global",
          imageStyle: "photo",
          factCheck: true,
          internalLinks: true,
          includeVideo: false,
          relatedTools: [],
        }),
      });
      if (!r.ok || !r.body) {
        bag.job.failed++;
        bag.job.lastError = `HTTP ${r.status}`;
      } else {
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let created: { title: string; slug: string } | null = null;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line) continue;
            try {
              const e = JSON.parse(line);
              if (e.type === "step" && e.status === "start" && e.detail) {
                bag.job.currentTopic = `${catSlug} · ${e.detail}`;
                bag.job.lastEventAt = Date.now();
              } else if (e.type === "done" && e.post) {
                created = { title: e.post.title, slug: e.post.slug };
              } else if (e.type === "error" && e.error) {
                bag.job.lastError = String(e.error);
              }
            } catch {}
          }
        }
        if (buf.trim()) {
          try {
            const e = JSON.parse(buf);
            if (e.type === "done" && e.post) created = { title: e.post.title, slug: e.post.slug };
          } catch {}
        }
        if (created) {
          bag.job.generated++;
          bag.job.recent.unshift({ title: created.title, slug: created.slug, at: Date.now() });
          if (bag.job.recent.length > 10) bag.job.recent.length = 10;
        } else {
          bag.job.failed++;
          if (!bag.job.lastError) bag.job.lastError = "Không trả về bài";
        }
      }
    } catch (e) {
      if (ac.signal.aborted) break;
      bag.job.failed++;
      bag.job.lastError = String((e as Error)?.message || e);
    } finally {
      bag.abort = null;
      bag.job.lastEventAt = Date.now();
    }
    if (!bag.job.running) break;
    await new Promise((res) => setTimeout(res, 1500));
  }
  bag.job.running = false;
  bag.job.currentTopic = "";
}
