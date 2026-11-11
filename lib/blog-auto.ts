// Server-side continuous blog generator. Serverless functions are frozen once
// they respond, so nothing here may outlive a request: the job lives in the
// single-row `blog_auto_job` table and Supabase pg_cron calls
// POST /api/cron/blog-auto every minute (see supabase/blog_auto.sql). Each call
// generates exactly one post through the existing /api/blog/generate pipeline.
import { randomUUID } from "crypto";
import { listAdminCategories } from "./blog";
import {
  ALL_LIMITED_MARK,
  AUTO_GEN_DEFAULTS,
  type AiProvider,
  type AutoGenOptions,
  buildAutoModelChain,
  isRateLimitError,
  parseRetryDelayMs,
} from "./blog-ai-shared";
import { supabaseAdmin } from "./supabase";

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
  lockedUntil: number | null; // current tick's lease, or the end of the gap between posts
  recent: AutoRecent[];
  lastError?: string;
  provider?: string;
  model?: string;
};

type JobRow = {
  running: boolean;
  run_id: string | null;
  category: string;
  unlimited: boolean;
  target_count: number;
  generated: number;
  failed: number;
  consecutive_failures: number;
  current_topic: string;
  started_at: string | null;
  last_event_at: string | null;
  locked_until: string | null;
  recent: AutoRecent[];
  last_error: string | null;
  provider: string | null;
  model: string | null;
  options: Partial<AutoGenOptions> | null;
};

type TickOutcome =
  | { kind: "generated"; post: { title: string; slug: string } }
  | { kind: "failed"; error: string }
  | { kind: "stopped" };

export type TickResult = TickOutcome["kind"] | "idle";

const TABLE = "blog_auto_job";
const JOB_ID = 1;
const RECENT_LIMIT = 10;
// Longer than the 300s maxDuration of the tick route, so a crashed tick frees
// the job without ever overlapping a live one.
const LEASE_MS = 310_000;
// The loop runs unattended, so a bad API key must not burn calls forever.
const MAX_CONSECUTIVE_FAILURES = 5;
// When every model is rate-limited the job pauses instead of failing; bounds
// for that pause (the provider's hint is used when it gives one).
const RATE_LIMIT_PAUSE_MIN_MS = 60_000;
const RATE_LIMIT_PAUSE_MAX_MS = 30 * 60_000;
const RATE_LIMIT_PAUSE_DEFAULT_MS = 3 * 60_000;

function jobs() {
  return supabaseAdmin().from(TABLE);
}

function toMs(iso: string | null): number | null {
  return iso ? Date.parse(iso) : null;
}

function toStatus(row: JobRow): AutoStatus {
  return {
    running: row.running,
    category: row.category,
    unlimited: row.unlimited,
    targetCount: row.target_count,
    generated: row.generated,
    failed: row.failed,
    currentTopic: row.current_topic,
    startedAt: toMs(row.started_at),
    lastEventAt: toMs(row.last_event_at),
    lockedUntil: toMs(row.locked_until),
    recent: (row.recent || []).slice(0, RECENT_LIMIT),
    lastError: row.last_error ?? undefined,
    provider: row.provider ?? undefined,
    model: row.model ?? undefined,
  };
}

function idleStatus(lastError?: string): AutoStatus {
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
    lockedUntil: null,
    recent: [],
    lastError,
  };
}

export async function getAutoStatus(): Promise<AutoStatus> {
  try {
    const { data, error } = await jobs().select("*").eq("id", JOB_ID).maybeSingle();
    if (error) return idleStatus(error.message);
    return data ? toStatus(data as JobRow) : idleStatus();
  } catch (e) {
    return idleStatus(String((e as Error)?.message || e));
  }
}

export type StartConfig = {
  category?: string;
  unlimited: boolean;
  count: number;
  provider?: string;
  model?: string;
  options?: Partial<AutoGenOptions>;
};

function jobOptions(job: JobRow): AutoGenOptions {
  return { ...AUTO_GEN_DEFAULTS, ...job.options };
}

export async function startAuto(cfg: StartConfig): Promise<AutoStatus> {
  const now = new Date().toISOString();
  // `running = false` in the filter makes a double start a no-op. A fresh
  // run_id orphans any tick still finishing from a previous, stopped run.
  const { data, error } = await jobs()
    .update({
      running: true,
      run_id: randomUUID(),
      category: cfg.category || "random",
      options: cfg.options ?? {},
      unlimited: !!cfg.unlimited,
      target_count: cfg.unlimited ? 0 : Math.max(1, Math.floor(cfg.count)),
      generated: 0,
      failed: 0,
      consecutive_failures: 0,
      current_topic: "",
      started_at: now,
      last_event_at: now,
      recent: [],
      last_error: null,
      provider: cfg.provider ?? null,
      model: cfg.model ?? null,
      locked_until: null,
    })
    .eq("id", JOB_ID)
    .eq("running", false)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toStatus(data as JobRow) : getAutoStatus();
}

export async function stopAuto(): Promise<AutoStatus> {
  const { error } = await jobs().update({ running: false, current_topic: "" }).eq("id", JOB_ID);
  if (error) throw new Error(error.message);
  return getAutoStatus();
}

// Atomically take the lease; null when idle or another tick still holds it.
async function claimJob(): Promise<JobRow | null> {
  const now = Date.now();
  const { data, error } = await jobs()
    .update({ locked_until: new Date(now + LEASE_MS).toISOString() })
    .eq("id", JOB_ID)
    .eq("running", true)
    .or(`locked_until.is.null,locked_until.lt."${new Date(now).toISOString()}"`)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as JobRow | null;
}

// The job's category when it is still active; otherwise ("random", or the
// category was disabled mid-run) any active one.
async function resolveCategory(wanted: string): Promise<string> {
  const active = (await listAdminCategories()).filter((c) => c.active).map((c) => c.slug);
  if (active.includes(wanted)) return wanted;
  return active[Math.floor(Math.random() * active.length)] || "tech";
}

function availableProviders(): Record<AiProvider, boolean> {
  return {
    groq: !!process.env.GROQ_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    pollinations: true,
  };
}

// One pass through the generate pipeline with a fixed (provider, model). Never
// rotates — the caller `generateOne` does that on rate-limit.
async function generateWithModel(
  job: JobRow,
  baseUrl: string,
  provider: AiProvider,
  model: string,
  catSlug: string,
  contentOptions: Omit<AutoGenOptions, "gapMinutes">,
  ac: AbortController,
  heartbeat: (topic?: string) => Promise<void>,
): Promise<TickOutcome> {
  try {
    const r = await fetch(`${baseUrl}/api/blog/generate`, {
      method: "POST",
      signal: ac.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        ...contentOptions,
        // Auto mode ALWAYS picks a fresh random topic in the category — never
        // reuses a topic from the admin's config form.
        mode: "random",
        topic: undefined,
        provider,
        model,
        category: catSlug,
      }),
    });
    if (!r.ok || !r.body) return { kind: "failed", error: `HTTP ${r.status}` };

    let post: { title: string; slug: string } | null = null;
    let streamError = "";
    const handleLine = async (line: string) => {
      let e;
      try {
        e = JSON.parse(line);
      } catch {
        return;
      }
      if (e.type === "step" && e.status === "start") {
        await heartbeat(e.detail ? `${catSlug} · ${e.detail}` : undefined);
      } else if (e.type === "step" && e.step === "topic" && e.status === "done" && e.detail) {
        await heartbeat(`${catSlug} · ${e.detail}`);
      } else if (e.type === "done" && e.post) {
        post = { title: e.post.title, slug: e.post.slug };
      } else if (e.type === "error" && e.error) {
        streamError = String(e.error);
      }
    };

    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line) await handleLine(line);
      }
    }
    if (buf.trim()) await handleLine(buf.trim());

    if (post) return { kind: "generated", post };
    return { kind: "failed", error: streamError || "Không trả về bài" };
  } catch (e) {
    if (ac.signal.aborted) return { kind: "stopped" };
    return { kind: "failed", error: String((e as Error)?.message || e) };
  }
}

async function generateOne(job: JobRow, baseUrl: string): Promise<TickOutcome> {
  const ac = new AbortController();

  // Publishes progress and aborts the post when the admin stopped this run.
  const heartbeat = async (currentTopic?: string) => {
    const { data, error } = await jobs()
      .update({
        last_event_at: new Date().toISOString(),
        ...(currentTopic ? { current_topic: currentTopic } : {}),
      })
      .eq("id", JOB_ID)
      .eq("run_id", job.run_id)
      .eq("running", true)
      .select("id")
      .maybeSingle();
    if (!error && !data) ac.abort();
  };

  const { gapMinutes: _gap, ...contentOptions } = jobOptions(job);
  const catSlug = await resolveCategory(job.category);
  await heartbeat(`${catSlug} · đang khởi động…`);

  // Rotate on rate-limit so a single provider's 429 doesn't burn the tick:
  // chain starts with the job's configured model, then falls back through
  // every other available (provider, model).
  const chain = buildAutoModelChain(
    { provider: (job.provider || "groq") as AiProvider, model: job.model },
    availableProviders(),
  );
  if (!chain.length) return { kind: "failed", error: "Không có AI provider khả dụng" };

  // Cap attempts per tick so one rate-limited round doesn't balloon latency;
  // the next tick picks up with the model we last recorded.
  const maxAttempts = Math.min(chain.length, 3);
  let lastError = "";
  for (let i = 0; i < maxAttempts; i++) {
    const { provider, model } = chain[i];
    if (i > 0) await heartbeat(`${catSlug} · đổi model (${provider}/${model})…`);
    const outcome = await generateWithModel(job, baseUrl, provider, model, catSlug, contentOptions, ac, heartbeat);
    if (outcome.kind !== "failed") {
      // Persist the working model so the next tick starts from here instead of
      // hammering the originally-selected one while it is still rate-limited.
      if (i > 0 && !ac.signal.aborted) {
        await jobs()
          .update({ provider, model, last_event_at: new Date().toISOString() })
          .eq("id", JOB_ID)
          .eq("run_id", job.run_id);
      }
      return outcome;
    }
    lastError = outcome.error;
    if (!isRateLimitError(outcome.error)) return outcome;
    if (ac.signal.aborted) return { kind: "stopped" };
    // The pipeline already walked every model and all of them are limited —
    // starting it again from another model would only hit the same 429s.
    if (outcome.error.includes(ALL_LIMITED_MARK)) break;
  }
  return { kind: "failed", error: lastError || "Tất cả model đều bị giới hạn" };
}

async function finishTick(job: JobRow, outcome: TickOutcome) {
  // locked_until doubles as "not before": pg_cron skips the job until it passes.
  const gapMinutes = Math.max(0, Number(jobOptions(job).gapMinutes) || 0);
  const patch: Record<string, unknown> = {
    locked_until: gapMinutes ? new Date(Date.now() + gapMinutes * 60_000).toISOString() : null,
    last_event_at: new Date().toISOString(),
  };
  if (gapMinutes) patch.current_topic = `Đang giãn cách ${gapMinutes} phút trước bài kế tiếp`;
  // `running` is only ever written to end the job, so a Stop that lands while
  // this tick runs is never overwritten.
  if (outcome.kind === "generated") {
    const generated = job.generated + 1;
    patch.generated = generated;
    patch.consecutive_failures = 0;
    patch.recent = [{ ...outcome.post, at: Date.now() }, ...(job.recent || [])].slice(0, RECENT_LIMIT);
    if (!job.unlimited && generated >= job.target_count) {
      patch.running = false;
      patch.current_topic = "";
    }
  } else if (outcome.kind === "failed" && isRateLimitError(outcome.error)) {
    // Quota exhaustion is temporary: keep the job running, don't count it
    // toward the auto-stop, and push the next tick past the cooldown.
    const pauseMs = Math.min(
      RATE_LIMIT_PAUSE_MAX_MS,
      Math.max(RATE_LIMIT_PAUSE_MIN_MS, parseRetryDelayMs(outcome.error) ?? RATE_LIMIT_PAUSE_DEFAULT_MS),
    );
    const notBefore = Math.max(Date.now() + pauseMs, Date.parse(String(patch.locked_until || 0)) || 0);
    patch.locked_until = new Date(notBefore).toISOString();
    patch.last_error = outcome.error;
    patch.current_topic = `Các model đang bị giới hạn — tự thử lại sau ~${Math.ceil((notBefore - Date.now()) / 60_000)} phút`;
  } else if (outcome.kind === "failed") {
    const consecutive = job.consecutive_failures + 1;
    patch.failed = job.failed + 1;
    patch.consecutive_failures = consecutive;
    patch.last_error = outcome.error;
    if (consecutive >= MAX_CONSECUTIVE_FAILURES) {
      patch.running = false;
      patch.current_topic = "";
      patch.last_error = `Tự dừng sau ${consecutive} lần lỗi liên tiếp: ${outcome.error}`;
    }
  }
  const { error } = await jobs().update(patch).eq("id", JOB_ID).eq("run_id", job.run_id);
  if (error) throw new Error(error.message);
}

// Runs one generation for the active job. Called once per pg_cron request.
export async function runAutoTick(baseUrl: string): Promise<TickResult> {
  const job = await claimJob();
  if (!job) return "idle";
  const outcome = await generateOne(job, baseUrl);
  await finishTick(job, outcome);
  if (outcome.kind === "generated") {
    // Fire-and-forget: Web Push tới mọi subscription đã đăng ký, để admin
    // nhận được notification kể cả khi tab đã đóng. Lỗi push không được
    // phép fail tick.
    try {
      const { sendBlogNewPostPush } = await import("@/lib/push");
      await sendBlogNewPostPush(outcome.post);
    } catch {}
  }
  return outcome.kind;
}
