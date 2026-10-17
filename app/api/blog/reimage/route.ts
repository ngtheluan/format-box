import { isAdmin } from "@/lib/admin-auth";
import { getAdminPost, updatePost, withCoverCredit } from "@/lib/blog";
import { imageCaption, pickImages, toQuery, type ImageSlot } from "@/lib/blog-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Re-pick relevant photos for an existing post: the cover plus every auto-generated
// inline image (legacy /api/img, Pollinations or unresolved IMG:: placeholders).
const AUTO_IMG = /!\[([^\]]*)\]\(((?:IMG::|\/api\/img\?|https?:\/\/image\.pollinations\.ai\/)[^)]*)\)(\n\*Ảnh:[^\n]*\*)?/g;

function promptOf(src: string): string {
  if (src.startsWith("IMG::")) return src.slice(5);
  try {
    const u = new URL(src, "http://x");
    return u.searchParams.get("prompt") || decodeURIComponent(u.pathname.split("/prompt/")[1] || "");
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug, cover = true } = (await req.json().catch(() => ({}))) as { slug?: string; cover?: boolean };
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });
  const post = await getAdminPost(slug);
  if (!post) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (post.status === "published") {
    return NextResponse.json({ error: "Bài đã phát hành — chuyển về Nháp trước khi sửa" }, { status: 409 });
  }

  const md = post.markdown;
  const slots: ImageSlot[] = [];
  let m: RegExpExecArray | null;
  let n = 0;
  AUTO_IMG.lastIndex = 0;
  while ((m = AUTO_IMG.exec(md))) {
    const ctx = md.slice(0, m.index).match(/##\s+(.+)\n/g)?.pop()?.replace(/^##\s+/, "") || post.title;
    slots.push({ key: `img${++n}`, alt: m[1], query: toQuery(promptOf(m[2]) || m[1], 6), context: ctx });
  }
  if (cover) {
    slots.unshift({
      key: "cover",
      alt: post.title,
      query: toQuery(`${post.tags.join(" ")} ${post.cover.label}`, 5),
      context: `${post.title} — ${post.excerpt}`,
    });
  }
  if (!slots.length) return NextResponse.json({ error: "Bài không có ảnh tự động để thay" }, { status: 400 });

  const picked = await pickImages(slots, { title: post.title, provider: "groq" });
  let k = 0;
  const nextMd = md.replace(AUTO_IMG, (all, alt) => {
    const c = picked[`img${++k}`];
    return c ? `![${alt}](${c.url})\n${imageCaption(c)}` : all;
  });
  const patch: Record<string, unknown> = { markdown: nextMd };
  const c = picked.cover;
  if (c) {
    patch.cover_image = withCoverCredit(c.url, {
      name: c.credit,
      url: c.creditUrl,
      source: c.source === "unsplash" ? "Unsplash" : c.license || "Openverse",
    });
  }
  await updatePost(slug, patch);
  const found = Object.values(picked).filter(Boolean).length;
  return NextResponse.json({ ok: true, found, total: slots.length, coverImage: patch.cover_image ?? post.coverImage });
}
