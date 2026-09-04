import Link from "next/link";

export default function Footer() {
  return (
    <footer className="ft">
      <div className="ft-grid">
        <div className="ft-brand">
          <div className="logo" style={{ cursor: "default" }}>
            <svg viewBox="0 0 26 26">
              <rect x="2" y="2" width="22" height="22" />
              <line x1="2" y1="13" x2="24" y2="13" />
              <line x1="13" y1="2" x2="13" y2="24" />
            </svg>
            <b>
              Format<span>Box</span>
            </b>
          </div>
          <p>
            Bộ công cụ chuyển đổi dữ liệu chạy hoàn toàn trên trình duyệt. Không upload, không đăng
            ký, không quảng cáo.
          </p>
        </div>
        <div className="ft-col">
          <h4>TOOLS</h4>
          <Link href="/base64">Base64</Link>
          <Link href="/json">JSON Formatter</Link>
          <Link href="/graph">JSON Graph</Link>
          <Link href="/image">Image Converter</Link>
          <Link href="/bill">Bill Splitter</Link>
        </div>
        <div className="ft-col">
          <h4>AUTHOR</h4>
          <div className="ft-author">
            <div className="ft-avatar">L</div>
            <div className="ft-author-info">
              <b>Luân</b>
              <a href="mailto:nguyenluan.work@gmail.com">nguyenluan.work@gmail.com</a>
            </div>
          </div>
        </div>
      </div>
      <div className="ft-bottom">
        <span>&copy; 2026 FormatBox. Made in Ho Chi Minh City.</span>
        <span className="mono">v1.0 · Next.js · no backend</span>
      </div>
    </footer>
  );
}
