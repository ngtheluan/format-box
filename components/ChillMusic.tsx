"use client";

import { Slider } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { IconMusic, IconMusicOff, IconVolume } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

// Royalty-free instrumental tracks from Pixabay (Pixabay Content License — free,
// no attribution required).
const CHILL_TRACKS = [
  {
    key: "lofi",
    label: "Lofi Chill",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
  {
    key: "forest",
    label: "Forest Lullaby",
    url: "https://cdn.pixabay.com/download/audio/2021/11/23/audio_64b2dd1bce.mp3",
  },
];

const DEFAULT_VOL = 0.1;

// Background music for the article reader and the exhibit rooms. Default: on, 10%
// volume. Toggle, track and volume are shared between both through localStorage.
export function ChillMusic({ onFlash }: { onFlash?: (msg: string) => void }) {
  const { t } = useI18n();
  const [trackIdx, setTrackIdx] = useState(0);
  const [on, setOn] = useState(true);
  const [vol, setVol] = useState(DEFAULT_VOL);
  const [showVol, setShowVol] = useState(false);
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

  useEffect(() => {
    if (!showVol) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setShowVol(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showVol]);

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

  function changeVolume(pct: number) {
    setVol(pct / 100);
    // Dragging the volume up while muted means the listener wants to hear it.
    if (pct > 0 && !on) setOn(true);
  }

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
        onClick={() => setShowVol((v) => !v)}
        aria-label={t("blog_music_volume")}
        aria-expanded={showVol}
        title={`${t("blog_music_volume")}: ${volPct}%`}
        className={showVol ? "is-on" : ""}
      >
        {volPct}%
      </button>
      {showVol && (
        <div className="bd-tools-music-vol" role="group" aria-label={t("blog_music_volume")}>
          <IconVolume size={16} stroke={1.9} aria-hidden="true" />
          <Slider
            value={volPct}
            min={0}
            max={100}
            step={5}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label={t("blog_music_volume")}
          />
          <span className="bd-tools-music-val">{volPct}%</span>
        </div>
      )}
      <audio ref={audioRef} src={track.url} loop preload="auto" style={{ display: "none" }} />
    </div>
  );
}
