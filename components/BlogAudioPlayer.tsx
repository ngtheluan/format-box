"use client";

import { useState } from "react";
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
    if (url) {
      setUrl(null);
      load(v);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        margin: "16px 0 20px",
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "var(--bg2)",
        flexWrap: "wrap",
      }}
    >
      <IconVolume size={18} stroke={1.8} style={{ color: "var(--accent)" }} />
      <strong style={{ fontSize: "0.85rem" }}>Nghe bài viết (AI)</strong>

      <select
        value={voice}
        onChange={(e) => onVoiceChange(e.target.value)}
        style={{
          padding: "4px 8px",
          fontSize: "0.8rem",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--bg)",
          color: "var(--text)",
        }}
        aria-label="Giọng đọc"
      >
        {VOICES.map((v) => (
          <option key={v.key} value={v.key}>
            {v.label}
          </option>
        ))}
      </select>

      {!url && !loading && (
        <button
          type="button"
          onClick={() => load(voice)}
          style={{
            padding: "5px 12px",
            fontSize: "0.8rem",
            fontWeight: 600,
            borderRadius: 6,
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Tạo audio
        </button>
      )}

      {loading && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--dim)" }}>
          <IconLoader2 size={14} className="spin" /> Đang tổng hợp giọng…
        </span>
      )}

      {error && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--err)" }}>
          <IconAlertTriangle size={14} /> {error}
        </span>
      )}

      {url && (
        <audio
          controls
          src={url}
          preload="none"
          style={{ flex: 1, minWidth: 220, height: 36 }}
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
