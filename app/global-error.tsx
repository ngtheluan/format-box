"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0a0e15",
          color: "#f2f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: "2.6rem", marginBottom: 8 }}>⚠️</div>
          <h1 style={{ fontSize: "1.6rem", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Ứng dụng gặp lỗi nghiêm trọng
          </h1>
          <p style={{ color: "#8b95a3", marginBottom: 22, lineHeight: 1.55 }}>
            {error.message || "The app crashed. Please refresh."}
          </p>
          {error.digest && (
            <code
              style={{
                display: "inline-block",
                padding: "4px 10px",
                background: "#161c28",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: 6,
                fontFamily: "monospace",
                fontSize: ".78rem",
                color: "#8b95a3",
                marginBottom: 20,
              }}
            >
              digest: {error.digest}
            </code>
          )}
          <div>
            <button
              onClick={reset}
              style={{
                padding: "12px 26px",
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: ".92rem",
                cursor: "pointer",
              }}
            >
              Thử lại
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
