export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODELS = ["flux", "turbo"] as const;

function buildUrl(prompt: string, w: number, h: number, seed: number, model: string) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&model=${model}&seed=${seed}`;
}

async function ok(url: string, timeoutMs: number) {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    const r = await fetch(url, { method: "HEAD", signal: ac.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const prompt = (u.searchParams.get("prompt") || "image").slice(0, 400);
  const w = Math.min(2048, Math.max(64, Number(u.searchParams.get("w") || "1024")));
  const h = Math.min(2048, Math.max(64, Number(u.searchParams.get("h") || "576")));
  const baseSeed = (Number(u.searchParams.get("seed") || "0") >>> 0) || 1;

  for (const model of MODELS) {
    for (let i = 0; i < 4; i++) {
      const seed = ((baseSeed + i * 1000003) >>> 0) || 1;
      const target = buildUrl(prompt, w, h, seed, model);
      if (await ok(target, 10000)) {
        return Response.redirect(target, 302);
      }
    }
  }

  const fallback = `https://placehold.co/${w}x${h}/1a1a2e/ffffff/png?text=${encodeURIComponent(prompt.slice(0, 40))}`;
  return Response.redirect(fallback, 302);
}
