import { NextRequest, NextResponse } from "next/server";
import { castVote, getVotes, type ReactionKind } from "@/lib/blog";
import { blogVoterId } from "@/lib/blog-voter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function isKind(v: string): v is ReactionKind {
  return v === "helpful" || v === "unhelpful";
}

// GET /api/blog/react?slug=... — counts + this reader's current choice.
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim() || "";
  if (!slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });
  try {
    const votes = await getVotes(slug, blogVoterId());
    return NextResponse.json(votes, { headers: NO_STORE });
  } catch (e) {
    console.error("[blog/react] GET failed:", e);
    return NextResponse.json({ helpful: 0, unhelpful: 0, mine: null }, { headers: NO_STORE });
  }
}

// POST /api/blog/react { slug, kind } — one vote per reader; clicking the same
// choice again clears it. Returns the new counts + this reader's choice.
export async function POST(req: NextRequest) {
  let body: { slug?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const slug = String(body.slug || "").trim();
  const kind = String(body.kind || "").trim();
  if (!slug || !isKind(kind)) {
    return NextResponse.json({ error: "missing slug or kind" }, { status: 400 });
  }
  try {
    const votes = await castVote(slug, blogVoterId(), kind);
    return NextResponse.json(votes, { headers: NO_STORE });
  } catch (e) {
    console.error("[blog/react] POST failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
