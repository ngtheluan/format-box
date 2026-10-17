"use client";

import { useEffect, useState } from "react";
import { IconVolume, IconLoader2, IconAlertTriangle } from "@tabler/icons-react";

type Props = {
  slug: string;
};

const VOICES = [
  { key: "hoaimy", label: "Hoài My (Nữ)" },
  { key: "namminh", label: "Nam Minh (Nam)" },
];

export function BlogAudioPlayer({ slug }: Props) {
  const [voice, setVoice] = useState("hoaimy");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (v: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/blog/tts?slug=${encodeURIComponent(slug)}&voice=${v}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo audio");
      setUrl(data.url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onVoiceChange = (v: string) => {
    setVoice(v);
    setUrl(null);
    load(v);
  };

  // Auto-generate on mount so the user can press play without first clicking a button.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load(voice);
  }, [slug]);

  return (
    <div
      className="bd-audio"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        margin: 0,
        fontSize: "0.78rem",
        color: "var(--text)",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <IconVolume size={15} stroke={2} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, lineHeight: 1.15 }}>
        <strong style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--bright)" }}>Nghe bài viết</strong>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.72rem",
            color: "var(--dim)",
          }}
        >
          <select
            value={voice}
            onChange={(e) => onVoiceChange(e.target.value)}
            style={{
              padding: 0,
              fontSize: "0.72rem",
              borderRadius: 0,
              border: 0,
              background: "transparent",
              color: "var(--dim)",
              cursor: "pointer",
            }}
            aria-label="Giọng đọc"
          >
            {VOICES.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
          {loading && (
            <>
              <span>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <IconLoader2 size={11} className="spin" /> Đang tạo…
              </span>
            </>
          )}
          {error && (
            <>
              <span>·</span>
              <button
                type="button"
                onClick={() => load(voice)}
                style={{
                  padding: 0,
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  border: 0,
                  background: "transparent",
                  color: "var(--err)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
                title={error}
              >
                <IconAlertTriangle size={11} style={{ verticalAlign: "middle" }} /> Thử lại
              </button>
            </>
          )}
        </span>
      </div>
      {url && (
        <audio
          controls
          src={url}
          preload="metadata"
          style={{ height: 32, maxWidth: 220 }}
        />
      )}
      <style jsx>{`
        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
