"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconLoader2,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconVolume,
} from "@tabler/icons-react";

type Props = {
  slug: string;
};

const VOICES = [
  { key: "hoaimy", label: "Hoài My" },
  { key: "namminh", label: "Nam Minh" },
];

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function BlogAudioPlayer({ slug }: Props) {
  const [voice, setVoice] = useState("hoaimy");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    setPlaying(false);
    setCur(0);
    setDur(0);
    load(v);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load(voice);
  }, [slug]);

  function toggle() {
    const el = audioRef.current;
    if (!el || !url) return;
    if (el.paused) el.play();
    else el.pause();
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    el.currentTime = p * dur;
    setCur(el.currentTime);
  }

  const pct = dur ? (cur / dur) * 100 : 0;
  const disabled = !url || loading;

  return (
    <div className={`bd-audio${playing ? " is-playing" : ""}`}>
      <button
        type="button"
        className="bd-audio-play"
        onClick={toggle}
        disabled={disabled}
        aria-label={playing ? "Tạm dừng" : "Phát"}
      >
        {loading ? (
          <IconLoader2 size={16} className="bd-audio-spin" />
        ) : playing ? (
          <IconPlayerPauseFilled size={14} />
        ) : (
          <IconPlayerPlayFilled size={14} />
        )}
      </button>

      <div className="bd-audio-body">
        <div className="bd-audio-head">
          <IconVolume size={12} stroke={2} />
          <strong>Nghe bài viết</strong>
          <span className="bd-audio-sep" />
          <select
            className="bd-audio-voice"
            value={voice}
            onChange={(e) => onVoiceChange(e.target.value)}
            aria-label="Giọng đọc"
          >
            {VOICES.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
          {error && (
            <button type="button" className="bd-audio-err" onClick={() => load(voice)} title={error}>
              <IconAlertTriangle size={11} /> Thử lại
            </button>
          )}
        </div>
        <div
          className="bd-audio-track"
          onClick={seek}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label="Tiến độ phát"
        >
          <div className="bd-audio-fill" style={{ width: `${pct}%` }} />
          <div className="bd-audio-knob" style={{ left: `${pct}%` }} />
        </div>
      </div>

      <span className="bd-audio-time">
        <b>{fmt(cur)}</b>
        <i>/</i>
        <span>{fmt(dur)}</span>
      </span>

      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          style={{ display: "none" }}
        />
      )}
    </div>
  );
}
