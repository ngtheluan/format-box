"use client";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowBackUp,
  IconDownload,
  IconEraser,
  IconMicrophone,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconRepeat,
  IconScissors,
  IconUpload,
  IconVolume,
  IconWaveSine,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Peaks = { min: Float32Array; max: Float32Array };

const LAME_SUPPORTED_SR = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];
function nearestLameSr(sr: number) {
  return LAME_SUPPORTED_SR.reduce((p, c) => (Math.abs(c - sr) < Math.abs(p - sr) ? c : p), 44100);
}
function floatToInt16(f: Float32Array): Int16Array {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

async function encodeMp3(buffer: AudioBuffer, bitrate: number, onProgress?: (p: number) => void): Promise<Blob> {
  const lame = (await import("@breezystack/lamejs")).default as unknown as {
    Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => {
      encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
      flush(): Int8Array;
    };
  };
  const numCh = Math.min(2, buffer.numberOfChannels);
  const sr = buffer.sampleRate;
  const encoder = new lame.Mp3Encoder(numCh, sr, bitrate);
  const left = floatToInt16(buffer.getChannelData(0));
  const right = numCh > 1 ? floatToInt16(buffer.getChannelData(1)) : null;
  const BLOCK = 1152;
  const chunks: Int8Array[] = [];
  const total = left.length;
  for (let i = 0; i < total; i += BLOCK) {
    const l = left.subarray(i, i + BLOCK);
    const r = right ? right.subarray(i, i + BLOCK) : null;
    const enc = r ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l);
    if (enc.length > 0) chunks.push(enc);
    if (onProgress && i % (BLOCK * 50) === 0) {
      onProgress(i / total);
      await new Promise((res) => setTimeout(res, 0));
    }
  }
  const end = encoder.flush();
  if (end.length > 0) chunks.push(end);
  onProgress?.(1);
  return new Blob(chunks as unknown as BlobPart[], { type: "audio/mp3" });
}

async function encodeViaMediaRecorder(
  buffer: AudioBuffer,
  mimeType: string,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error(`Format ${mimeType} not supported by browser`);
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC({ sampleRate: buffer.sampleRate });
  const dest = ctx.createMediaStreamDestination();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(dest);
  const rec = new MediaRecorder(dest.stream, { mimeType });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  return new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => {
      ctx.close();
      resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
    };
    rec.onerror = (ev) => reject(new Error(String(ev)));
    const total = buffer.duration * 1000;
    const started = performance.now();
    const tick = () => {
      if (rec.state === "recording") {
        onProgress?.(Math.min(1, (performance.now() - started) / total));
        requestAnimationFrame(tick);
      }
    };
    rec.start(100);
    src.start(0);
    src.onended = () => setTimeout(() => rec.state !== "inactive" && rec.stop(), 100);
    requestAnimationFrame(tick);
  });
}

function computePeaks(buffer: AudioBuffer, width: number, from = 0, to = 1): Peaks {
  const ch = buffer.numberOfChannels;
  const len = buffer.length;
  const s0 = Math.floor(from * len);
  const s1 = Math.min(len, Math.floor(to * len));
  const span = Math.max(1, s1 - s0);
  const samplesPerPixel = Math.max(1, Math.floor(span / width));
  const min = new Float32Array(width);
  const max = new Float32Array(width);
  const data0 = buffer.getChannelData(0);
  const data1 = ch > 1 ? buffer.getChannelData(1) : null;
  for (let x = 0; x < width; x++) {
    const s = s0 + x * samplesPerPixel;
    const e = Math.min(s1, s + samplesPerPixel);
    let mn = 1,
      mx = -1;
    for (let i = s; i < e; i++) {
      const v = data1 ? (data0[i] + data1[i]) * 0.5 : data0[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    min[x] = mn;
    max[x] = mx;
  }
  return { min, max };
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = len * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const wstr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  wstr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  wstr(8, "WAVE");
  wstr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  wstr(36, "data");
  view.setUint32(40, dataSize, true);
  const chs: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) chs.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, chs[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

function fmtTime(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}
function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Detect first/last non-silent sample (threshold in linear amplitude)
function detectSilence(buffer: AudioBuffer, threshold = 0.005) {
  const ch = buffer.numberOfChannels;
  const len = buffer.length;
  const d0 = buffer.getChannelData(0);
  const d1 = ch > 1 ? buffer.getChannelData(1) : null;
  let start = 0,
    end = len - 1;
  for (let i = 0; i < len; i++) {
    const v = Math.abs(d1 ? (d0[i] + d1[i]) * 0.5 : d0[i]);
    if (v > threshold) {
      start = i;
      break;
    }
  }
  for (let i = len - 1; i >= 0; i--) {
    const v = Math.abs(d1 ? (d0[i] + d1[i]) * 0.5 : d0[i]);
    if (v > threshold) {
      end = i;
      break;
    }
  }
  return { start: start / len, end: end / len };
}

export default function AudioStudioTool() {
  const toast = useToast();
  const { t } = useI18n();

  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [peaks, setPeaks] = useState<Peaks | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [gain, setGain] = useState(1);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [bass, setBass] = useState(0);
  const [mid, setMid] = useState(0);
  const [treble, setTreble] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [normalize, setNormalize] = useState(false);
  const [looping, setLooping] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [scroll, setScroll] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playHead, setPlayHead] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"wav" | "mp3" | "webm" | "ogg">("wav");
  const [mp3Bitrate, setMp3Bitrate] = useState(192);
  const [exportProgress, setExportProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recLevel, setRecLevel] = useState(0);
  const [recTime, setRecTime] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filtersRef = useRef<{ low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode } | null>(null);
  const playStartRef = useRef(0);
  const playOffsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<"start" | "end" | "seek" | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recAnalyserRef = useRef<AnalyserNode | null>(null);
  const recRafRef = useRef<number | null>(null);
  const recStartRef = useRef(0);

  const duration = buffer?.duration ?? 0;
  const startTime = trimStart * duration;
  const endTime = trimEnd * duration;
  const selDur = Math.max(0, endTime - startTime);

  const ensureCtx = () => {
    if (!audioCtxRef.current) {
      const AC =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    return audioCtxRef.current;
  };

  const loadFile = useCallback(
    async (f: File) => {
      setDecoding(true);
      setFile(f);
      try {
        const arr = await f.arrayBuffer();
        const ctx = ensureCtx();
        const buf = await ctx.decodeAudioData(arr.slice(0));
        setBuffer(buf);
        setTrimStart(0);
        setTrimEnd(1);
        setPlayHead(0);
        setZoom(1);
        setScroll(0);
        playOffsetRef.current = 0;
      } catch (e) {
        toast((e as Error).message || "Decode failed");
        setBuffer(null);
      } finally {
        setDecoding(false);
      }
    },
    [toast],
  );

  const loadBuffer = useCallback((buf: AudioBuffer, name: string) => {
    setBuffer(buf);
    setFile(new File([new Blob()], name));
    setTrimStart(0);
    setTrimEnd(1);
    setPlayHead(0);
    setZoom(1);
    setScroll(0);
    playOffsetRef.current = 0;
  }, []);

  // Draw waveform (with zoom+scroll)
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !buffer) return;
    const parent = cv.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = 180;
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const from = scroll;
    const to = Math.min(1, scroll + 1 / zoom);
    setPeaks(computePeaks(buffer, w, from, to));
  }, [buffer, zoom, scroll]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !peaks || !buffer) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.width / dpr;
    const h = cv.height / dpr;
    ctx.clearRect(0, 0, w, h);

    const from = scroll;
    const view = 1 / zoom;
    const toScreen = (r: number) => ((r - from) / view) * w;

    const cs = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue("--accent").trim() || "#38bdf8";
    const dim = cs.getPropertyValue("--dim").trim() || "#64748b";
    const border = cs.getPropertyValue("--border").trim() || "#334155";

    const sx = Math.max(-10, toScreen(trimStart));
    const ex = Math.min(w + 10, toScreen(trimEnd));
    ctx.fillStyle = accent + "22";
    ctx.fillRect(Math.max(0, sx), 0, Math.min(w, ex) - Math.max(0, sx), h);

    const mid = h / 2;
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();

    for (let x = 0; x < w; x++) {
      const r = from + (x / w) * view;
      const inSel = r >= trimStart && r <= trimEnd;
      ctx.strokeStyle = inSel ? accent : dim;
      const y1 = mid + peaks.min[x] * mid * 0.95;
      const y2 = mid + peaks.max[x] * mid * 0.95;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, y1);
      ctx.lineTo(x + 0.5, y2);
      ctx.stroke();
    }

    // handles
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    if (sx >= 0 && sx <= w) {
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }
    if (ex >= 0 && ex <= w) {
      ctx.beginPath();
      ctx.moveTo(ex, 0);
      ctx.lineTo(ex, h);
      ctx.stroke();
    }

    if (playHead > 0) {
      const ph = toScreen(playHead / buffer.duration);
      if (ph >= 0 && ph <= w) {
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ph, 0);
        ctx.lineTo(ph, h);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, [peaks, trimStart, trimEnd, playHead, buffer, zoom, scroll]);

  // Canvas mouse: choose closest handle within 12px, else seek
  const canvasToRatio = (clientX: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = clientX - rect.left;
    const view = 1 / zoom;
    let r = scroll + (px / rect.width) * view;
    return Math.max(0, Math.min(1, r));
  };
  const onCanvasDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!buffer) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const view = 1 / zoom;
    const startPx = ((trimStart - scroll) / view) * rect.width;
    const endPx = ((trimEnd - scroll) / view) * rect.width;
    const r = canvasToRatio(e.clientX);
    if (Math.abs(px - startPx) < 8) {
      dragRef.current = "start";
      setTrimStart(Math.min(r, trimEnd - 0.001));
      return;
    }
    if (Math.abs(px - endPx) < 8) {
      dragRef.current = "end";
      setTrimEnd(Math.max(r, trimStart + 0.001));
      return;
    }
    // seek: set playhead & offset
    dragRef.current = "seek";
    const time = r * buffer.duration;
    playOffsetRef.current = time;
    setPlayHead(time);
    if (playing) {
      stopPlayback();
      play();
    }
  };
  const onCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || !buffer) return;
    const r = canvasToRatio(e.clientX);
    if (dragRef.current === "start") setTrimStart(Math.min(r, trimEnd - 0.001));
    else if (dragRef.current === "end") setTrimEnd(Math.max(r, trimStart + 0.001));
    else if (dragRef.current === "seek") {
      playOffsetRef.current = r * buffer.duration;
      setPlayHead(r * buffer.duration);
    }
  };
  const onCanvasUp = () => (dragRef.current = null);
  const onCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!buffer) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const r = canvasToRatio(e.clientX);
      const nz = Math.max(1, Math.min(20, zoom * (e.deltaY < 0 ? 1.25 : 0.8)));
      const view = 1 / nz;
      let ns = r - (r - scroll) * (nz > zoom ? view / (1 / zoom) : view / (1 / zoom));
      ns = Math.max(0, Math.min(1 - view, ns));
      setZoom(nz);
      setScroll(ns);
    } else {
      const view = 1 / zoom;
      setScroll((s) => Math.max(0, Math.min(1 - view, s + (e.deltaY > 0 ? view * 0.1 : -view * 0.1))));
    }
  };

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (!buffer) return;
    const ctx = ensureCtx();
    stopPlayback();
    if (ctx.state === "suspended") ctx.resume();

    // Build filter chain: src -> low -> mid -> high -> gain -> destination
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = speed;
    src.loop = looping;
    if (looping) {
      src.loopStart = startTime;
      src.loopEnd = endTime;
    }

    const low = ctx.createBiquadFilter();
    low.type = "lowshelf";
    low.frequency.value = 200;
    low.gain.value = bass;
    const midF = ctx.createBiquadFilter();
    midF.type = "peaking";
    midF.frequency.value = 1000;
    midF.Q.value = 1;
    midF.gain.value = mid;
    const high = ctx.createBiquadFilter();
    high.type = "highshelf";
    high.frequency.value = 3200;
    high.gain.value = treble;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(low).connect(midF).connect(high).connect(g).connect(ctx.destination);

    const from = Math.max(startTime, Math.min(endTime - 0.001, playOffsetRef.current || startTime));
    const dur = Math.max(0.01, endTime - from);
    src.start(0, from, looping ? undefined : dur);
    playStartRef.current = ctx.currentTime;
    src.onended = () => {
      if (!looping) {
        playOffsetRef.current = 0;
        setPlayHead(0);
        setPlaying(false);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    sourceRef.current = src;
    gainNodeRef.current = g;
    filtersRef.current = { low, mid: midF, high };
    setPlaying(true);
    const tick = () => {
      const elapsed = (ctx.currentTime - playStartRef.current) * speed;
      let cur = from + elapsed;
      if (looping && cur > endTime) {
        cur = startTime + ((cur - startTime) % Math.max(0.001, selDur));
      }
      setPlayHead(cur);
      if (looping || cur < endTime) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [buffer, startTime, endTime, speed, gain, bass, mid, treble, looping, selDur, stopPlayback]);

  const pause = () => {
    if (!sourceRef.current || !audioCtxRef.current) return;
    const elapsed = (audioCtxRef.current.currentTime - playStartRef.current) * speed;
    playOffsetRef.current = Math.min(endTime - 0.001, (playOffsetRef.current || startTime) + elapsed);
    stopPlayback();
  };

  useEffect(() => stopPlayback, [stopPlayback]);

  // Live update filters/gain while playing
  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = gain;
  }, [gain]);
  useEffect(() => {
    if (!filtersRef.current) return;
    filtersRef.current.low.gain.value = bass;
    filtersRef.current.mid.gain.value = mid;
    filtersRef.current.high.gain.value = treble;
  }, [bass, mid, treble]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!buffer) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        playing ? pause() : play();
      }
      if (e.key === "l" || e.key === "L") setLooping((v) => !v);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(20, z * 1.25));
      if (e.key === "-") setZoom((z) => Math.max(1, z / 1.25));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer, playing, play]);

  const trimSilence = () => {
    if (!buffer) return;
    const r = detectSilence(buffer, 0.005);
    setTrimStart(r.start);
    setTrimEnd(r.end);
    toast(t("audio_silence_trimmed"));
  };

  const reset = () => {
    setTrimStart(0);
    setTrimEnd(1);
    setSpeed(1);
    setGain(1);
    setFadeIn(0);
    setFadeOut(0);
    setBass(0);
    setMid(0);
    setTreble(0);
    setReverse(false);
    setNormalize(false);
    setLooping(false);
    setZoom(1);
    setScroll(0);
    playOffsetRef.current = 0;
    setPlayHead(0);
    stopPlayback();
  };

  const clear = () => {
    stopPlayback();
    setFile(null);
    setBuffer(null);
    setPeaks(null);
    reset();
  };

  // === Recording ===
  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;
      const ctx = ensureCtx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      recAnalyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tickLvl = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs(data[i] - 128) / 128;
          if (v > peak) peak = v;
        }
        setRecLevel(peak);
        setRecTime((performance.now() - recStartRef.current) / 1000);
        recRafRef.current = requestAnimationFrame(tickLvl);
      };
      recStartRef.current = performance.now();
      recRafRef.current = requestAnimationFrame(tickLvl);

      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && recChunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(recChunksRef.current, { type: mr.mimeType || "audio/webm" });
        const arr = await blob.arrayBuffer();
        try {
          const buf = await ctx.decodeAudioData(arr);
          loadBuffer(buf, `recording-${Date.now()}.webm`);
          toast(t("audio_recorded"));
        } catch (e) {
          toast((e as Error).message || "Decode recording failed");
        }
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
    } catch (e) {
      toast((e as Error).message || t("audio_mic_error"));
    }
  };

  const stopRecord = () => {
    mediaRecRef.current?.stop();
    recStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    recStreamRef.current = null;
    mediaRecRef.current = null;
    if (recRafRef.current) cancelAnimationFrame(recRafRef.current);
    recRafRef.current = null;
    setRecording(false);
    setRecLevel(0);
    setRecTime(0);
  };

  // === Export via OfflineAudioContext (applies EQ + speed + gain natively) ===
  const doExport = async () => {
    if (!buffer) return;
    setExporting(true);
    setExportProgress(0);
    try {
      const targetSr = exportFormat === "mp3" ? nearestLameSr(buffer.sampleRate) : buffer.sampleRate;
      const sr = targetSr;
      const numCh = buffer.numberOfChannels;
      const srcStart = startTime;
      const srcDur = Math.max(0.001, endTime - startTime);
      const outLen = Math.max(1, Math.floor((srcDur * sr) / speed));
      const OAC =
        window.OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
      const off = new OAC(numCh, outLen, sr);

      const src = off.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = speed;
      const low = off.createBiquadFilter();
      low.type = "lowshelf";
      low.frequency.value = 200;
      low.gain.value = bass;
      const midF = off.createBiquadFilter();
      midF.type = "peaking";
      midF.frequency.value = 1000;
      midF.Q.value = 1;
      midF.gain.value = mid;
      const high = off.createBiquadFilter();
      high.type = "highshelf";
      high.frequency.value = 3200;
      high.gain.value = treble;
      const g = off.createGain();
      g.gain.value = gain;
      src.connect(low).connect(midF).connect(high).connect(g).connect(off.destination);
      src.start(0, srcStart, srcDur);

      const rendered = await off.startRendering();

      // Post: reverse / fade / normalize
      for (let c = 0; c < numCh; c++) {
        const ch = rendered.getChannelData(c);
        if (reverse) ch.reverse();
        const fInS = Math.min(outLen, Math.floor(fadeIn * sr));
        const fOutS = Math.min(outLen, Math.floor(fadeOut * sr));
        for (let i = 0; i < fInS; i++) ch[i] *= i / fInS;
        for (let i = 0; i < fOutS; i++) ch[outLen - 1 - i] *= i / fOutS;
      }
      if (normalize) {
        let peak = 0;
        for (let c = 0; c < numCh; c++) {
          const ch = rendered.getChannelData(c);
          for (let i = 0; i < outLen; i++) {
            const a = Math.abs(ch[i]);
            if (a > peak) peak = a;
          }
        }
        if (peak > 0 && peak < 0.99) {
          const scale = 0.99 / peak;
          for (let c = 0; c < numCh; c++) {
            const ch = rendered.getChannelData(c);
            for (let i = 0; i < outLen; i++) ch[i] *= scale;
          }
        }
      }

      let blob: Blob;
      let ext = "wav";
      if (exportFormat === "wav") {
        blob = encodeWav(rendered);
      } else if (exportFormat === "mp3") {
        blob = await encodeMp3(rendered, mp3Bitrate, setExportProgress);
        ext = "mp3";
      } else if (exportFormat === "webm") {
        blob = await encodeViaMediaRecorder(rendered, "audio/webm;codecs=opus", setExportProgress);
        ext = "webm";
      } else {
        // ogg
        const mime = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "audio/webm;codecs=opus";
        blob = await encodeViaMediaRecorder(rendered, mime, setExportProgress);
        ext = mime.includes("ogg") ? "ogg" : "webm";
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const base = (file?.name || "audio").replace(/\.[^.]+$/, "");
      a.href = url;
      a.download = `${base}-edited.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast(t("audio_exported"));
    } catch (e) {
      toast((e as Error).message || "Export failed");
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("audio/")) loadFile(f);
    else if (f) toast(t("audio_invalid"));
  };

  const info = useMemo(() => {
    if (!buffer || !file) return null;
    return { duration: buffer.duration, sr: buffer.sampleRate, ch: buffer.numberOfChannels, size: file.size };
  }, [buffer, file]);

  return (
    <div className="tool-card">
      <div className="as-root">
        {!buffer && (
          <div
            className={`as-drop${dragOver ? " over" : ""}${recording ? " recording" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {!recording ? (
              <>
                <IconWaveSine size={40} stroke={1.4} />
                <div className="as-drop-title">{t("audio_drop_title")}</div>
                <div className="as-drop-sub">{t("audio_drop_sub")}</div>
                <div className="as-drop-actions">
                  <label className="as-upload-btn">
                    <IconUpload size={14} stroke={1.8} />
                    {t("audio_choose")}
                    <input
                      type="file"
                      accept="audio/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) loadFile(f);
                      }}
                    />
                  </label>
                  <label className="as-upload-btn as-rec-btn" onClick={startRecord}>
                    <IconMicrophone size={14} stroke={1.8} />
                    {t("audio_record")}
                  </label>
                </div>
                {decoding && <div className="as-decoding">{t("audio_decoding")}</div>}
              </>
            ) : (
              <>
                <div className="as-rec-indicator">
                  <span className="as-rec-dot" />
                  {t("audio_recording")} · {fmtTime(recTime)}
                </div>
                <div className="as-level">
                  <div className="as-level-bar" style={{ width: `${Math.min(100, recLevel * 180)}%` }} />
                </div>
                <Button onClick={stopRecord} leftIcon={<IconPlayerStopFilled size={14} />}>
                  {t("audio_stop")}
                </Button>
              </>
            )}
          </div>
        )}

        {buffer && (
          <>
            <div className="as-meta">
              <span className="as-badge as-badge-file">{file?.name}</span>
              {info && (
                <>
                  <span className="as-badge">{fmtTime(info.duration)}</span>
                  <span className="as-badge">
                    {info.sr / 1000}kHz · {info.ch === 1 ? "Mono" : "Stereo"}
                  </span>
                  {info.size > 0 && <span className="as-badge">{fmtSize(info.size)}</span>}
                </>
              )}
              <div className="as-meta-actions">
                <Button size="sm" variant="subtle" onClick={() => setZoom((z) => Math.max(1, z / 1.5))}>
                  <IconZoomOut size={14} />
                </Button>
                <span className="as-zoom">{zoom.toFixed(1)}x</span>
                <Button size="sm" variant="subtle" onClick={() => setZoom((z) => Math.min(20, z * 1.5))}>
                  <IconZoomIn size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={trimSilence}
                  leftIcon={<IconScissors size={14} stroke={1.8} />}
                >
                  {t("audio_trim_silence")}
                </Button>
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={reset}
                  leftIcon={<IconArrowBackUp size={14} stroke={1.8} />}
                >
                  {t("audio_reset")}
                </Button>
                <Button size="sm" variant="subtle" onClick={clear} leftIcon={<IconEraser size={14} stroke={1.8} />}>
                  {t("act_clear")}
                </Button>
              </div>
            </div>

            <div className="as-wave" ref={wrapRef}>
              <canvas
                ref={canvasRef}
                onMouseDown={onCanvasDown}
                onMouseMove={onCanvasMove}
                onMouseUp={onCanvasUp}
                onMouseLeave={onCanvasUp}
                onWheel={onCanvasWheel}
              />
              {zoom > 1 && (
                <input
                  className="as-scroll"
                  type="range"
                  min={0}
                  max={1 - 1 / zoom}
                  step={0.001}
                  value={scroll}
                  onChange={(e) => setScroll(Number(e.target.value))}
                />
              )}
            </div>

            <div className="as-transport">
              <Button
                size="md"
                onClick={playing ? pause : play}
                leftIcon={playing ? <IconPlayerPauseFilled size={16} /> : <IconPlayerPlayFilled size={16} />}
              >
                {playing ? t("audio_pause") : t("audio_play")}
              </Button>
              <Button
                size="md"
                variant={looping ? "primary" : "subtle"}
                onClick={() => setLooping((v) => !v)}
                leftIcon={<IconRepeat size={15} stroke={1.8} />}
              >
                {t("audio_loop")}
              </Button>
              <Button
                size="md"
                variant="subtle"
                onClick={recording ? stopRecord : startRecord}
                leftIcon={recording ? <IconPlayerStopFilled size={14} /> : <IconMicrophone size={15} stroke={1.8} />}
              >
                {recording ? `${fmtTime(recTime)}` : t("audio_record")}
              </Button>
              <div className="as-time">
                <span>{fmtTime(playHead || startTime)}</span>
                <span className="dim"> / {fmtTime(endTime)}</span>
              </div>
              <div className="as-sel">
                {t("audio_selection")}: <b>{fmtTime(selDur)}</b>
              </div>
            </div>

            <div className="as-controls">
              <div className="as-ctrl">
                <label>{t("audio_speed")}</label>
                <input
                  type="range"
                  min={0.25}
                  max={3}
                  step={0.05}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                />
                <span className="as-val">{speed.toFixed(2)}x</span>
              </div>
              <div className="as-ctrl">
                <label>
                  <IconVolume size={13} stroke={1.8} /> {t("audio_volume")}
                </label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={gain}
                  onChange={(e) => setGain(Number(e.target.value))}
                />
                <span className="as-val">{Math.round(gain * 100)}%</span>
              </div>
              <div className="as-ctrl">
                <label>{t("audio_fade_in")}</label>
                <input
                  type="range"
                  min={0}
                  max={Math.min(5, selDur / 2)}
                  step={0.1}
                  value={fadeIn}
                  onChange={(e) => setFadeIn(Number(e.target.value))}
                />
                <span className="as-val">{fadeIn.toFixed(1)}s</span>
              </div>
              <div className="as-ctrl">
                <label>{t("audio_fade_out")}</label>
                <input
                  type="range"
                  min={0}
                  max={Math.min(5, selDur / 2)}
                  step={0.1}
                  value={fadeOut}
                  onChange={(e) => setFadeOut(Number(e.target.value))}
                />
                <span className="as-val">{fadeOut.toFixed(1)}s</span>
              </div>
              <div className="as-ctrl">
                <label>{t("audio_bass")}</label>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={bass}
                  onChange={(e) => setBass(Number(e.target.value))}
                />
                <span className="as-val">
                  {bass > 0 ? "+" : ""}
                  {bass}dB
                </span>
              </div>
              <div className="as-ctrl">
                <label>{t("audio_mid")}</label>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={mid}
                  onChange={(e) => setMid(Number(e.target.value))}
                />
                <span className="as-val">
                  {mid > 0 ? "+" : ""}
                  {mid}dB
                </span>
              </div>
              <div className="as-ctrl">
                <label>{t("audio_treble")}</label>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={treble}
                  onChange={(e) => setTreble(Number(e.target.value))}
                />
                <span className="as-val">
                  {treble > 0 ? "+" : ""}
                  {treble}dB
                </span>
              </div>
              <label className="as-check">
                <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} />
                {t("audio_reverse")}
              </label>
              <label className="as-check">
                <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} />
                {t("audio_normalize")}
              </label>
            </div>

            <div className="as-export">
              <div className="as-fmt">
                <span className="as-fmt-label">{t("audio_format")}:</span>
                {(["wav", "mp3", "webm", "ogg"] as const).map((f) => (
                  <button
                    key={f}
                    className={`as-fmt-btn${exportFormat === f ? " active" : ""}`}
                    onClick={() => setExportFormat(f)}
                    disabled={exporting}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              {exportFormat === "mp3" && (
                <div className="as-fmt">
                  <span className="as-fmt-label">{t("audio_bitrate")}:</span>
                  {[96, 128, 192, 256, 320].map((b) => (
                    <button
                      key={b}
                      className={`as-fmt-btn${mp3Bitrate === b ? " active" : ""}`}
                      onClick={() => setMp3Bitrate(b)}
                      disabled={exporting}
                    >
                      {b}k
                    </button>
                  ))}
                </div>
              )}
              <Button onClick={doExport} disabled={exporting} leftIcon={<IconDownload size={15} stroke={1.8} />}>
                {exporting
                  ? `${t("audio_exporting")}${exportProgress > 0 ? ` ${Math.round(exportProgress * 100)}%` : ""}`
                  : `${t("audio_export")} ${exportFormat.toUpperCase()}`}
              </Button>
              {(exportFormat === "webm" || exportFormat === "ogg") && (
                <div className="as-warn">{t("audio_realtime_warn")}</div>
              )}
              <div className="as-hint">{t("audio_hint")}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
