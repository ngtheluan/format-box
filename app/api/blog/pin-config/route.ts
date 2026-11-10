import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { getPinConfig, setPinConfig, type BlogPinConfig, type BlogPinMode } from "@/lib/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = await getPinConfig();
  return NextResponse.json({ ok: true, config });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { mode?: BlogPinMode; category?: string };
  const mode = body.mode;
  if (mode !== "manual" && mode !== "auto" && mode !== "category" && mode !== "random") {
    return NextResponse.json({ error: "Mode không hợp lệ" }, { status: 400 });
  }
  if (mode === "category" && !body.category) {
    return NextResponse.json({ error: "Thiếu danh mục" }, { status: 400 });
  }
  const next: BlogPinConfig = mode === "category" ? { mode, category: body.category } : { mode };
  try {
    await setPinConfig(next);
    revalidatePath("/blog");
    return NextResponse.json({ ok: true, config: next });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB lỗi" }, { status: 500 });
  }
}
