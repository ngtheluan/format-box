// Server-side continuous blog generator. Serverless functions are frozen once
// they respond, so nothing here may outlive a request: the job lives in the
// single-row `blog_auto_job` table and Supabase pg_cron calls
// POST /api/cron/blog-auto every minute (see supabase/blog_auto.sql). Each call
// generates exactly one post through the existing /api/blog/generate pipeline.
import { randomUUID } from "crypto";
import { listAdminCategories } from "./blog";
import { AUTO_GEN_DEFAULTS, type AutoGenOptions } from "./blog-ai-shared";
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

  try {
    const { gapMinutes: _gap, ...contentOptions } = jobOptions(job);
    const catSlug = await resolveCategory(job.category);
    await heartbeat(`${catSlug} · đang khởi động…`);
    const r = await fetch(`${baseUrl}/api/blog/generate`, {
      method: "POST",
      signal: ac.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        ...contentOptions,
        mode: "random",
        provider: job.provider || "groq",
        model: job.model ?? undefined,
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
  return outcome.kind;
}
