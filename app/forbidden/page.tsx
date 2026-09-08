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
    <div className="fx-scope">
      <div className="fx-glow" aria-hidden />
      <div className="fx-card">
        <div className="fx-icon-wrap">
          <span className="fx-ping" />
          <span className="fx-icon">
            <IconLock size={30} stroke={1.8} />
          </span>
        </div>

        <div className="fx-tag">403 · Forbidden</div>
        <h1 className="fx-title">Không có quyền truy cập</h1>
        <p className="fx-sub">
          Trang bạn đang cố truy cập hiện đang <b>tắt</b>. Admin đã ẩn tính năng này khỏi menu.
        </p>

        {from && (
          <div className="fx-from">
            <span className="fx-from-lbl">Đường dẫn</span>
            <code>{from}</code>
          </div>
        )}

        <div className="fx-actions">
          <Link href="/" className="fx-btn fx-btn-primary">
            <IconHome size={15} stroke={2} /> Về trang chủ
          </Link>
          <Link href="/" className="fx-btn">
            <IconArrowLeft size={15} stroke={2} /> Quay lại
          </Link>
        </div>

        <div className="fx-hint">
          Nếu bạn là admin, có thể bật lại tính năng ở <Link href="/admin/menu">/admin/menu</Link>.
        </div>
      </div>
    </div>
  );
}
