import type { Metadata } from "next";
import Link from "next/link";
import { IconBooks, IconSparkles } from "@tabler/icons-react";
import { Corners } from "@/components/BlogCard";
import { Stack } from "@/components/ui";
import { listPublicDidYouKnow } from "@/lib/blog";
import { DidYouKnow } from "../DidYouKnow";
import { KnowledgeStats } from "./KnowledgeStats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bảo tàng tri thức · FormatBox",
  description:
    "Bảo tàng số 'Có thể bạn chưa biết' — mỗi hiện vật một sự thật thú vị, kèm ảnh minh họa, ghi chú giám tuyển và câu đố để sưu tầm tem.",
};

export default async function KnowledgePage() {
  const dyk = await listPublicDidYouKnow();
  const slugs = dyk.map((it) => it.slug);
  return (
    <div className="blog-wrap">
      <Stack gap={28}>
        <header className="bz-hero bz-knowledge" aria-labelledby="knowledge-h1">
          <Corners />
          <span className="bz-knowledge-glow" aria-hidden="true" />
          <nav className="bz-crumb" aria-label="Breadcrumb">
            <Link href="/" prefetch={false}>
              FormatBox
            </Link>
            <i>/</i>
            <Link href="/blog" prefetch={false}>
              Blog
            </Link>
            <i>/</i>
            <span>Bảo tàng tri thức</span>
          </nav>
          <div className="bz-knowledge-head">
            <span className="bz-knowledge-badge" aria-hidden="true">
              <IconBooks size={22} stroke={1.8} />
            </span>
            <div className="bz-knowledge-title">
              <span className="bz-eyebrow">
                <IconSparkles size={13} stroke={2} /> Có thể bạn chưa biết
              </span>
              <h1 id="knowledge-h1" className="bz-title">
                Bảo tàng tri thức
              </h1>
              <p className="bz-dek">
                Mỗi hiện vật một sự thật thú vị — xem ảnh, đọc ghi chú giám tuyển và trả lời câu đố để sưu tầm tem kỷ
                niệm.
              </p>
            </div>
          </div>
          <KnowledgeStats exhibitSlugs={slugs} />
        </header>
        <DidYouKnow items={dyk} fullList />
      </Stack>
    </div>
  );
}
