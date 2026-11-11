"use client";

import { useI18n } from "@/lib/i18n";
import { IconMinus, IconMusic, IconMusicOff, IconPlus } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

// Royalty-free instrumental tracks từ Pixabay (Pixabay Content License —
// free, không cần ghi tác giả). URL đã kiểm nên không 404; nếu thêm bài
// mới bạn phải tự xác nhận URL hoạt động (Pixabay 403 theo request thô).
// Thứ tự = mood đi từ nhẹ (đọc blog) → chậm sâu hơn (bảo tàng).
const CHILL_TRACKS = [
  {
    key: "lofi-study",
    label: "Lofi học bài",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
  {
    key: "ambient-room",
    label: "Phòng tranh",
    url: "https://cdn.pixabay.com/download/audio/2022/08/04/audio_2dde668d05.mp3",
  },
  {
    key: "forest-lullaby",
    label: "Rừng mưa",
    url: "https://cdn.pixabay.com/download/audio/2021/11/23/audio_64b2dd1bce.mp3",
  },
];

const DEFAULT_VOL = 0.1;
const VOL_STEP = 0.1;

// Background music for the article reader and the exhibit rooms. Default: on, 10%
// volume. Toggle, track and volume are shared between both through localStorage.
export function ChillMusic({ onFlash }: { onFlash?: (msg: string) => void }) {
  const { t } = useI18n();
  const [trackIdx, setTrackIdx] = useState(0);
  const [on, setOn] = useState(true);
  const [vol, setVol] = useState(DEFAULT_VOL);
  const [ready, setReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Restore last choice.
  useEffect(() => {
    try {
      const track = Number(localStorage.getItem("fb-blog-music-track") || "0");
      if (Number.isFinite(track) && track >= 0 && track < CHILL_TRACKS.length) setTrackIdx(track);
      if (localStorage.getItem("fb-blog-music-on") === "0") setOn(false);
      // 0 counts as unset: earlier versions stored 0 for every first-time reader.
      const saved = Number(localStorage.getItem("fb-blog-music-vol"));
      if (saved > 0 && saved <= 1) setVol(saved);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (audioRef.current) audioRef.current.volume = vol;
    try {
      localStorage.setItem("fb-blog-music-vol", String(vol));
    } catch {}
  }, [vol, ready]);

  // Browsers may block autoplay until the user interacts; start on the first
  // interaction in that case. A new track's src is already committed here.
  useEffect(() => {
    if (!ready) return;
    const el = audioRef.current;
    if (!el) return;
    try {
      localStorage.setItem("fb-blog-music-on", on ? "1" : "0");
      localStorage.setItem("fb-blog-music-track", String(trackIdx));
    } catch {}
    if (!on) {
      el.pause();
      return;
    }
    let disposed = false;
    const stopWaiting = () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
    const start = () => {
      stopWaiting();
      el.play().catch(() => {});
    };
    el.play().catch(() => {
      if (disposed) return;
      window.addEventListener("pointerdown", start, { once: true });
      window.addEventListener("keydown", start, { once: true });
    });
    return () => {
      disposed = true;
      stopWaiting();
    };
  }, [on, trackIdx, ready]);

  useEffect(() => {
    const el = audioRef.current;
    return () => el?.pause();
  }, []);

  const track = CHILL_TRACKS[trackIdx];
  const volPct = Math.round(vol * 100);

  function toggle() {
    const next = !on;
    setOn(next);
    onFlash?.(next ? `${t("blog_music")}: ${track.label}` : t("blog_music_stopped"));
  }

  function cycleTrack() {
    const next = (trackIdx + 1) % CHILL_TRACKS.length;
    setTrackIdx(next);
    onFlash?.(`${t("blog_music")}: ${CHILL_TRACKS[next].label}`);
  }

  // Clamp 0..1, nudge in VOL_STEP increments. Khi tăng âm lúc đang mute thì
  // bật lại luôn, khi giảm về 0 thì tự tắt để icon không nói "đang bật".
  function changeVolumeBy(delta: number) {
    const next = Math.max(0, Math.min(1, +(vol + delta).toFixed(2)));
    setVol(next);
    if (next > 0 && !on) setOn(true);
    if (next === 0 && on) setOn(false);
  }

  function onVolWheel(e: React.WheelEvent) {
    // Scroll up = tăng, scroll down = giảm; 1 nấc mỗi tick.
    e.preventDefault();
    changeVolumeBy(e.deltaY < 0 ? VOL_STEP : -VOL_STEP);
  }

  const canDec = vol > 0;
  const canInc = vol < 1;

  return (
    <div ref={rootRef} className="bd-tools-group bd-tools-music" aria-label={t("blog_music")}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? t("blog_music_off") : t("blog_music_on")}
        title={on ? `${track.label} · ${t("blog_music_off")}` : t("blog_music_on")}
        className={on ? "is-on" : ""}
      >
        {on ? <IconMusic size={14} stroke={1.9} /> : <IconMusicOff size={14} stroke={1.9} />}
      </button>
      <button
        type="button"
        onClick={cycleTrack}
        aria-label={t("blog_music_next")}
        title={`${track.label} · ${t("blog_music_next")}`}
      >
        {trackIdx + 1}/{CHILL_TRACKS.length}
      </button>
      <button
        type="button"
        onClick={() => changeVolumeBy(-VOL_STEP)}
        disabled={!canDec}
        aria-label={`${t("blog_music_volume")} −10%`}
        title={`${t("blog_music_volume")} −10%`}
        className="bd-tools-music-step"
      >
        <IconMinus size={12} stroke={2.4} />
      </button>
      <span
        role="status"
        aria-label={`${t("blog_music_volume")}: ${volPct}%`}
        title={`${t("blog_music_volume")}: ${volPct}% · cuộn chuột để chỉnh`}
        className="bd-tools-music-val-inline"
        onWheel={onVolWheel}
      >
        {volPct}%
      </span>
      <button
        type="button"
        onClick={() => changeVolumeBy(VOL_STEP)}
        disabled={!canInc}
        aria-label={`${t("blog_music_volume")} +10%`}
        title={`${t("blog_music_volume")} +10%`}
        className="bd-tools-music-step"
      >
        <IconPlus size={12} stroke={2.4} />
      </button>
      <audio ref={audioRef} src={track.url} loop preload="auto" style={{ display: "none" }} />
    </div>
  );
}
