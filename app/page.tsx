import Link from "next/link";
import {
  IconCheck,
  IconLink,
  IconHash,
  IconPalette,
  IconFingerprint,
  IconKey,
  IconClock,
  IconRuler,
  IconLetterCase,
  IconTable,
  IconCalculator,
} from "@tabler/icons-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import LiveDemo from "@/components/LiveDemo";
import HeroCanvas from "@/components/HeroCanvas";
import { TOOLS as tools } from "@/lib/tools";

const stats = [
  { k: "0", v: "byte upload" },
  { k: "5", v: "công cụ" },
  { k: "100%", v: "client-side" },
  { k: "∞", v: "lần dùng" },
];

const why = [
  { n: "01", h: "Chạy trên trình duyệt", p: "Không server nào nhận dữ liệu. Tắt mạng vẫn dùng được." },
  { n: "02", h: "Tức thì, không giới hạn", p: "Không hàng đợi, không quota. File 50MB hay 5KB đều như nhau." },
  { n: "03", h: "Không tracking", p: "Không popup, không banner, không cookie theo dõi." },
  { n: "04", h: "Mọi thiết bị", p: "Desktop, mobile, tablet. Bookmark, dùng khi cần." },
];

const coming = [
  { Icon: IconLink, label: "URL Encode" },
  { Icon: IconHash, label: "HTML Entities" },
  { Icon: IconPalette, label: "Color Converter" },
  { Icon: IconFingerprint, label: "Hash (MD5 / SHA)" },
  { Icon: IconKey, label: "JWT Decoder" },
  { Icon: IconClock, label: "Unix Timestamp" },
  { Icon: IconRuler, label: "CSS Units" },
  { Icon: IconLetterCase, label: "Text Case" },
  { Icon: IconTable, label: "CSV ↔ JSON" },
  { Icon: IconCalculator, label: "Number Base" },
];

export default function Home() {
  return (
    <>
      <Nav />

      <header className="hero-modern">
        <div className="hero-canvas-wrap">
          <HeroCanvas />
        </div>

        <div className="hero-inner">
          <div className="hero-copy">
            <div className="tag">
              <span className="i-check">
                <IconCheck size={12} stroke={3} />
              </span>
              100% client-side · không upload
            </div>
            <h1>
              Chuyển đổi dữ liệu
              <br />
              <span className="g">ngay trên trình duyệt.</span>
            </h1>
            <p className="hero-sub">
              Base64, JSON, hình ảnh — paste vào, nhận kết quả tức thì.
              Dữ liệu không bao giờ rời khỏi máy bạn.
            </p>
            <div className="hero-cta">
              <a href="#tools" className="btn btn-p">Xem công cụ</a>
              <a href="#why" className="btn btn-g">Tại sao FormatBox?</a>
            </div>

            <div className="stat-strip">
              {stats.map((s) => (
                <div key={s.v} className="stat">
                  <b>{s.k}</b>
                  <span>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hero-demo-wrap">
          <LiveDemo />
        </div>
      </header>

      <section id="tools">
        <div className="mx">
          <div className="sh-wrap">
            <div className="stag">TOOLS</div>
            <h2 className="sh">Năm công cụ, một chỗ.</h2>
            <p className="sd">Không cần cài đặt, không cần đăng ký. Mở tab, làm việc, đóng tab.</p>
          </div>
          <div className="tools-grid">
            {tools.slice(0, 8).map((t, i) => (
              <Link
                key={t.href}
                href={t.href}
                className="tool-card-m"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="tool-head">
                  <div className="tool-icon">
                    <t.Icon size={22} stroke={1.6} />
                  </div>
                  <span className="tool-arrow">→</span>
                </div>
                <h3>{t.title}</h3>
                <div className="tool-sub">{t.sub}</div>
                <p>{t.desc}</p>
                <div className="bc-tags">
                  {t.tags.map((tag) => (
                    <span key={tag} className="bc-tag">{tag}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="why" style={{ paddingTop: 0 }}>
        <div className="mx">
          <div className="sh-wrap">
            <div className="stag">WHY</div>
            <h2 className="sh">Tool khác upload dữ liệu.<br />FormatBox thì không.</h2>
          </div>
          <div className="why">
            {why.map((w) => (
              <div key={w.n} className="wc">
                <div className="wc-n">{w.n}</div>
                <h3>{w.h}</h3>
                <p>{w.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="coming" style={{ paddingTop: 0 }}>
        <div className="mx">
          <div className="sh-wrap">
            <div className="stag">ROADMAP</div>
            <h2 className="sh">Sắp có thêm</h2>
          </div>
          <div className="coming">
            {coming.map((c) => (
              <span key={c.label} className="cp">
                <c.Icon size={15} stroke={1.7} />
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="mx">
          <div className="cta">
            <h2>Bắt đầu ngay, không cần đăng ký.</h2>
            <p>Chọn một tool ở trên hoặc bắt đầu với Base64.</p>
            <Link href="/base64" className="btn btn-p">Mở Base64 tool</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
