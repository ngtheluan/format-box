import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photobooth · Bộ ảnh chia sẻ",
  description: "Bộ ảnh và video từ photobooth, tự xoá sau 24 giờ.",
  robots: { index: false, follow: false },
};

type SearchParams = { p?: string | string[]; v?: string | string[]; m?: string | string[] };

function pick(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

export default function PhotoboothSharePage({ searchParams }: { searchParams: SearchParams }) {
  const photo = pick(searchParams.p);
  const video = pick(searchParams.v);
  const mirrored = (Array.isArray(searchParams.m) ? searchParams.m[0] : searchParams.m) === "1";

  if (!photo) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "var(--text)" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Link không hợp lệ</h1>
          <p style={{ opacity: 0.7, marginTop: 8 }}>Có thể link đã hết hạn hoặc bị cắt ngắn.</p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "20px 16px 60px",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <header style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Photobooth</h1>
          <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Ảnh và video tự xoá sau 24 giờ</p>
        </header>

        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid var(--border)",
            background: "var(--panel)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Photobooth strip" style={{ width: "100%", display: "block" }} />
        </div>

        <a
          href={photo}
          download
          style={{
            display: "inline-flex",
            justifyContent: "center",
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--accent)",
            color: "var(--bg)",
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Tải ảnh về máy
        </a>

        {video && (
          <>
            <div
              style={{
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "#000",
              }}
            >
              <video
                src={video}
                controls
                playsInline
                preload="metadata"
                style={{
                  width: "100%",
                  display: "block",
                  transform: mirrored ? "scaleX(-1)" : undefined,
                }}
              />
            </div>
            <a
              href={video}
              download
              style={{
                display: "inline-flex",
                justifyContent: "center",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Tải video về máy
            </a>
          </>
        )}
      </div>
    </main>
  );
}
