import Link from "next/link";
import { IconArrowLeft, IconHome, IconLock } from "@tabler/icons-react";
import "./forbidden.css";

export const dynamic = "force-dynamic";

export default function ForbiddenPage({
  searchParams,
}: {
  searchParams?: { from?: string };
}) {
  const from = searchParams?.from;
  return (
    <div className="fb-scope">
      <div className="fb-glow" aria-hidden />
      <div className="fb-card">
        <div className="fb-icon-wrap">
          <span className="fb-ping" />
          <span className="fb-icon">
            <IconLock size={30} stroke={1.8} />
          </span>
        </div>

        <div className="fb-tag">403 · Forbidden</div>
        <h1 className="fb-title">Không có quyền truy cập</h1>
        <p className="fb-sub">
          Trang bạn đang cố truy cập hiện đang <b>tắt</b>. Admin đã ẩn tính năng này khỏi menu.
        </p>

        {from && (
          <div className="fb-from">
            <span className="fb-from-lbl">Đường dẫn</span>
            <code>{from}</code>
          </div>
        )}

        <div className="fb-actions">
          <Link href="/" className="fb-btn fb-btn-primary">
            <IconHome size={15} stroke={2} /> Về trang chủ
          </Link>
          <Link href="/" className="fb-btn">
            <IconArrowLeft size={15} stroke={2} /> Quay lại
          </Link>
        </div>

        <div className="fb-hint">
          Nếu bạn là admin, có thể bật lại tính năng ở <Link href="/admin/menu">/admin/menu</Link>.
        </div>
      </div>
    </div>
  );
}
