import Link from "next/link";
import { IconHome, IconSearch } from "@tabler/icons-react";

export default function NotFound() {
  return (
    <div className="err-page">
      <div className="err-icon err-icon-404">404</div>
      <h1>Không tìm thấy trang</h1>
      <p>Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.</p>
      <div className="err-actions">
        <Link className="btn btn-p" href="/">
          <IconHome size={15} stroke={1.9} /> Về trang chủ
        </Link>
        <Link className="btn btn-g" href="/#tools">
          <IconSearch size={15} stroke={1.9} /> Xem tất cả công cụ
        </Link>
      </div>
    </div>
  );
}
