import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import LiveDemo from "@/components/LiveDemo";

const tools = [
  {
    href: "/base64",
    icon: "🔐",
    title: "Base64 Encode / Decode",
    desc: "Mã hóa và giải mã text hoặc file bất kỳ. Hỗ trợ UTF-8 đầy đủ, kéo thả file, đổi chiều một chạm.",
    tags: ["text", "file", "utf-8"],
    code: (
      <>
        <em>btoa</em>(&quot;xin chào&quot;) <span className="k">→</span>{" "}
        <span className="s">&quot;eGluIGNow6Bv&quot;</span>
      </>
    ),
  },
  {
    href: "/json",
    icon: "📋",
    title: "JSON Formatter & Validator",
    desc: "Format, minify, validate. Báo lỗi đúng vị trí, tree view thu gọn được, đếm keys và độ sâu.",
    tags: ["format", "minify", "tree"],
    code: (
      <>
        {"{"}
        <span className="k">&quot;name&quot;</span>: <span className="s">&quot;FormatBox&quot;</span>,{" "}
        <span className="k">&quot;free&quot;</span>: <span className="n">true</span>
        {"}"}
      </>
    ),
  },
  {
    href: "/image",
    icon: "🖼️",
    title: "Image Converter",
    desc: "PNG, JPG, WebP qua lại. Chỉnh chất lượng, xem trước, biết ngay giảm được bao nhiêu %.",
    tags: ["png", "jpg", "webp"],
  },
];

const why = [
  { n: "01", h: "Chạy hoàn toàn trên trình duyệt", p: "Không có server nào nhận dữ liệu của bạn. Tắt mạng vẫn dùng được sau khi trang đã load." },
  { n: "02", h: "Tức thì, không giới hạn", p: "Không hàng đợi, không quota, không bắt nâng cấp. File 50MB hay 5KB đều như nhau." },
  { n: "03", h: "Không quảng cáo, không tracking", p: "Không popup, không banner, không cookie theo dõi. Tool là tool." },
  { n: "04", h: "Mọi thiết bị", p: "Desktop, mobile, tablet. Bookmark lại, dùng khi cần." },
];

const coming = [
  "🔗 URL Encode / Decode", "🏷️ HTML Entities", "🎨 Color Converter",
  "#️⃣ Hash (MD5 / SHA)", "🪙 JWT Decoder", "⏱️ Unix Timestamp",
  "📐 CSS Units", "🔤 Text Case", "📊 CSV ↔ JSON", "🧮 Number Base",
];

export default function Home() {
  return (
    <>
      <Nav
        links={[
          { href: "#tools", label: "Công cụ" },
          { href: "#why", label: "Tại sao" },
          { href: "#coming", label: "Sắp có" },
        ]}
      />

      <header className="hero">
        <div className="tag"><i>✓</i> 100% client-side · không upload · miễn phí</div>
        <h1>
          Chuyển đổi dữ liệu<br />
          <span className="g">ngay trên trình duyệt.</span>
        </h1>
        <p className="hero-sub">
          Base64, JSON, hình ảnh — paste vào, nhận kết quả tức thì. Dữ liệu không bao giờ rời khỏi
          máy bạn.
        </p>
        <div className="hero-cta">
          <a href="#tools" className="btn btn-p">Xem công cụ</a>
          <a href="#why" className="btn btn-g">Tại sao FormatBox?</a>
        </div>
        <LiveDemo />
      </header>

      <section id="tools">
        <div className="mx">
          <div className="sh-wrap">
            <div className="stag">TOOLS</div>
            <h2 className="sh">Ba công cụ, một chỗ.</h2>
            <p className="sd">Không cần cài đặt, không cần đăng ký. Mở tab, làm việc, đóng tab.</p>
          </div>
          <div className="bento">
            {tools.map((t) => (
              <Link key={t.href} href={t.href} className="bc">
                <span className="bc-go">↗</span>
                <div className="bc-icon">{t.icon}</div>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
                {t.code && <div className="bc-code">{t.code}</div>}
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
            <h2 className="sh">
              Tool online khác upload dữ liệu của bạn.<br />
              FormatBox thì không.
            </h2>
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
            {coming.map((c) => <span key={c} className="cp">{c}</span>)}
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
