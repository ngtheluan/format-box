"use client";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowsShuffle,
  IconChefHat,
  IconConfetti,
  IconGlassFull,
  IconHistory,
  IconPlayerPlayFilled,
  IconRefresh,
  IconSettings,
  IconSparkles,
  IconTrash,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";
import confetti from "canvas-confetti";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, Textarea } from "@/components/ui";

type PresetId = "custom" | "food" | "drink" | "person";

const PRESET_DEFAULTS: Record<PresetId, string[]> = {
  custom: ["Táo", "Cam", "Chuối", "Dưa hấu", "Nho", "Xoài", "Dứa", "Bưởi"],
  food: [
    "Phở bò",
    "Bún bò Huế",
    "Cơm tấm",
    "Bánh mì",
    "Hủ tiếu",
    "Mì Quảng",
    "Bún chả",
    "Xôi mặn",
    "Bánh xèo",
    "Gỏi cuốn",
  ],
  drink: [
    "Trà sữa",
    "Cà phê sữa đá",
    "Nước cam",
    "Sinh tố bơ",
    "Nước dừa",
    "Trà chanh",
    "Soda chanh",
    "Nước mía",
    "Nước ép ổi",
  ],
  person: ["Đại", "Luân", "Hậu", "Ánh"],
};

const PRESET_ORDER: PresetId[] = ["custom", "food", "drink", "person"];

const storageKey = (id: PresetId) => `fb-wheel-${id}`;
const CURRENT_KEY = "fb-wheel-current";

const SIZE = 420;
const R = SIZE / 2 - 18;
const CX = SIZE / 2;
const CY = SIZE / 2;

const WHEEL_COLORS = [
  "#f43f5e",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
];

function pt(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(startDeg: number, endDeg: number) {
  const start = pt(CX, CY, R, endDeg);
  const end = pt(CX, CY, R, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}
function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function celebrate() {
  // Confetti burst from left + right corners for a wider spread
  const defaults = {
    startVelocity: 45,
    spread: 360,
    ticks: 90,
    zIndex: 9999,
    colors: ["#6366f1", "#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#a78bfa"],
  };
  const shoot = (origin: { x: number; y: number }) => {
    confetti({ ...defaults, particleCount: 90, origin, scalar: 1 });
    confetti({ ...defaults, particleCount: 40, origin, scalar: 1.4, shapes: ["circle"] });
  };
  shoot({ x: 0.2, y: 0.55 });
  shoot({ x: 0.8, y: 0.55 });
  setTimeout(() => shoot({ x: 0.5, y: 0.4 }), 250);
}

export default function WheelTool() {
  const toast = useToast();
  const { t } = useI18n();

  const [preset, setPreset] = useState<PresetId>("custom");
  const [raw, setRaw] = useState<string>(PRESET_DEFAULTS.custom.join("\n"));
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [removeWinner, setRemoveWinner] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount
  useEffect(() => {
    try {
      const cur = (localStorage.getItem(CURRENT_KEY) as PresetId | null) ?? "custom";
      const validCur: PresetId = PRESET_ORDER.includes(cur) ? cur : "custom";
      setPreset(validCur);
      const stored = localStorage.getItem(storageKey(validCur));
      if (stored !== null) setRaw(stored);
      else setRaw(PRESET_DEFAULTS[validCur].join("\n"));
    } catch {
      /* ignore */
    } finally {
      setReady(true);
    }
  }, []);

  // Persist current preset
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CURRENT_KEY, preset);
    } catch {
      /* ignore */
    }
  }, [preset, ready]);

  // Persist raw for the active preset
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey(preset), raw);
    } catch {
      /* ignore */
    }
  }, [raw, preset, ready]);

  const items = useMemo(
    () =>
      raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [raw],
  );
  const n = items.length;
  const step = n > 0 ? 360 / n : 0;

  const switchPreset = (p: PresetId) => {
    if (spinning) return;
    setPreset(p);
    try {
      const stored = localStorage.getItem(storageKey(p));
      setRaw(stored !== null ? stored : PRESET_DEFAULTS[p].join("\n"));
    } catch {
      setRaw(PRESET_DEFAULTS[p].join("\n"));
    }
    setWinner(null);
    setRotation(0);
  };

  const spin = () => {
    if (spinning) return;
    if (n < 2) {
      toast(t("wh_need_items"));
      return;
    }
    setWinner(null);
    setModalOpen(false);
    const winnerIdx = Math.floor(Math.random() * n);
    const spins = 6 + Math.floor(Math.random() * 3);
    const finalAngle = -(winnerIdx + 0.5) * step;
    const total = rotation + spins * 360 + ((finalAngle - (rotation % 360) + 720) % 360);
    setRotation(total);
    setSpinning(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSpinning(false);
      const w = items[winnerIdx];
      setWinner(w);
      setHistory((h) => [w, ...h].slice(0, 20));
      setModalOpen(true);
      celebrate();
      if (removeWinner) {
        setRaw(items.filter((_, i) => i !== winnerIdx).join("\n"));
      }
    }, 4200);
  };

  const shuffle = () => {
    if (spinning) return;
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setRaw(arr.join("\n"));
  };

  const reset = () => {
    if (spinning) return;
    setRaw(PRESET_DEFAULTS[preset].join("\n"));
    setRotation(0);
    setWinner(null);
  };

  const clearHistory = () => setHistory([]);

  const closeModal = () => setModalOpen(false);
  const spinAgain = () => {
    setModalOpen(false);
    setTimeout(spin, 100);
  };

  const presetIcon: Record<PresetId, React.ReactNode> = {
    custom: <IconSparkles size={14} stroke={1.9} />,
    food: <IconChefHat size={14} stroke={1.9} />,
    drink: <IconGlassFull size={14} stroke={1.9} />,
    person: <IconUsersGroup size={14} stroke={1.9} />,
  };
  const presetLabel: Record<PresetId, string> = {
    custom: t("wh_preset_custom"),
    food: t("wh_preset_food"),
    drink: t("wh_preset_drink"),
    person: t("wh_preset_person"),
  };

  return (
    <div className="wheel-layout">
      <aside className="wheel-side">
        <div className="wheel-preset-head">{t("wh_preset_label")}</div>
        <div className="wheel-presets">
          {PRESET_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              className={`wheel-preset${preset === p ? " on" : ""}`}
              onClick={() => switchPreset(p)}
              disabled={spinning}
            >
              {presetIcon[p]}
              <span>{presetLabel[p]}</span>
            </button>
          ))}
        </div>

        <div className="wheel-side-head">
          <label>{t("wh_items_label")}</label>
          <span className="wheel-count">
            {n} {t("wh_count")}
          </span>
        </div>
        <Textarea
          className="wheel-input"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={t("wh_items_placeholder")}
          spellCheck={false}
          disabled={spinning}
        />
        <p className="wheel-saved-hint">{t("wh_saved_hint")}</p>

        <div className="wheel-side-buttons">
          <button
            type="button"
            className="wheel-pill"
            onClick={() => setHistoryOpen(true)}
            disabled={spinning}
          >
            <IconHistory size={14} stroke={1.9} />
            <span>{t("wh_history")}</span>
            {history.length > 0 && <b className="wheel-pill-badge">{history.length}</b>}
          </button>
          <button
            type="button"
            className="wheel-pill"
            onClick={() => setSettingsOpen(true)}
            disabled={spinning}
          >
            <IconSettings size={14} stroke={1.9} />
            <span>{t("wh_settings")}</span>
          </button>
        </div>
      </aside>

      <div className="wheel-stage">
        {n >= 2 ? (
          <>
            <div className="wheel-wrap">
              <div className="wheel-pointer" aria-hidden="true" />
              <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className={`wheel-svg${spinning ? " spinning" : ""}`}
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <defs>
                  <radialGradient id="wheel-shine" cx="50%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                    <stop offset="55%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                  <radialGradient id="wheel-vignette" cx="50%" cy="50%" r="52%">
                    <stop offset="70%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
                  </radialGradient>
                  <radialGradient id="hub-grad" cx="50%" cy="35%" r="70%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="70%" stopColor="#f3f4f6" />
                    <stop offset="100%" stopColor="#d1d5db" />
                  </radialGradient>
                  <radialGradient id="hub-dot" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </radialGradient>
                  <filter id="wheel-drop" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
                    <feOffset dx="0" dy="4" result="off" />
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.35" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Outer decorative rim */}
                <circle cx={CX} cy={CY} r={R + 12} fill="#1f2937" />
                <circle cx={CX} cy={CY} r={R + 12} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                {Array.from({ length: 24 }).map((_, i) => {
                  const p = pt(CX, CY, R + 6, (i * 360) / 24);
                  return <circle key={`led-${i}`} cx={p.x} cy={p.y} r="2.4" fill={i % 2 ? "#fbbf24" : "#fff7ed"} />;
                })}

                <g filter="url(#wheel-drop)">
                  {items.map((item, i) => {
                    const startDeg = i * step;
                    const endDeg = (i + 1) * step;
                    const midDeg = startDeg + step / 2;
                    const textPt = pt(CX, CY, R * 0.62, midDeg);
                    const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
                    return (
                      <g key={i}>
                        <path d={arcPath(startDeg, endDeg)} fill={color} stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                        <text
                          x={textPt.x}
                          y={textPt.y}
                          transform={`rotate(${midDeg}, ${textPt.x}, ${textPt.y})`}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#fff"
                          fontSize={n > 12 ? 12 : n > 8 ? 14 : 16}
                          fontWeight={700}
                          style={{ textShadow: "0 1px 3px rgba(0,0,0,.55)", letterSpacing: 0.2 }}
                        >
                          {truncate(item, n > 12 ? 8 : n > 8 ? 12 : 16)}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Shine + vignette overlays */}
                <circle cx={CX} cy={CY} r={R} fill="url(#wheel-shine)" pointerEvents="none" />
                <circle cx={CX} cy={CY} r={R} fill="url(#wheel-vignette)" pointerEvents="none" />

                {/* Center hub */}
                <circle cx={CX} cy={CY} r="30" fill="url(#hub-grad)" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                <circle cx={CX} cy={CY} r="10" fill="url(#hub-dot)" />
              </svg>
            </div>

            <div className="wheel-cta">
              <Button
                className="wheel-spin"
                size="lg"
                onClick={spin}
                disabled={spinning}
                leftIcon={<IconPlayerPlayFilled size={16} />}
              >
                {spinning ? t("wh_spinning") : t("wh_spin")}
              </Button>
            </div>

            {winner && !spinning && !modalOpen && (
              <div className="wheel-winner">
                <IconConfetti size={16} stroke={1.8} style={{ color: "#f59e0b" }} />
                <span>{t("wh_winner")}</span>
                <b>{winner}</b>
              </div>
            )}
          </>
        ) : (
          <div className="wheel-empty">{t("wh_empty_wheel")}</div>
        )}
      </div>

      {historyOpen && (
        <div className="wheel-modal" role="dialog" aria-modal="true" onClick={() => setHistoryOpen(false)}>
          <div className="wheel-modal-card wheel-modal-panel" onClick={(e) => e.stopPropagation()}>
            <button className="wheel-modal-x" onClick={() => setHistoryOpen(false)} aria-label="Close">
              <IconX size={16} stroke={2} />
            </button>
            <div className="wheel-modal-panel-head">
              <IconHistory size={18} stroke={1.9} />
              <b>{t("wh_history")}</b>
              {history.length > 0 && (
                <button className="wheel-history-clear" onClick={clearHistory}>
                  <IconTrash size={12} stroke={1.9} /> {t("wh_clear_history")}
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="wheel-history-empty">{t("wh_history_empty")}</div>
            ) : (
              <ol className="wheel-history-list">
                {history.map((h, i) => (
                  <li key={`${h}-${i}`}>
                    <span>{i + 1}.</span> {h}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="wheel-modal" role="dialog" aria-modal="true" onClick={() => setSettingsOpen(false)}>
          <div className="wheel-modal-card wheel-modal-panel" onClick={(e) => e.stopPropagation()}>
            <button className="wheel-modal-x" onClick={() => setSettingsOpen(false)} aria-label="Close">
              <IconX size={16} stroke={2} />
            </button>
            <div className="wheel-modal-panel-head">
              <IconSettings size={18} stroke={1.9} />
              <b>{t("wh_settings")}</b>
            </div>
            <div className="wheel-settings-body">
              <Checkbox
                label={t("wh_remove_winner")}
                checked={removeWinner}
                onChange={(e) => setRemoveWinner(e.target.checked)}
                className="wheel-check"
              />
              <div className="actions wheel-actions">
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => {
                    shuffle();
                    setSettingsOpen(false);
                  }}
                  disabled={spinning}
                  leftIcon={<IconArrowsShuffle size={14} stroke={1.9} />}
                >
                  {t("wh_shuffle")}
                </Button>
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => {
                    reset();
                    setSettingsOpen(false);
                  }}
                  disabled={spinning}
                  leftIcon={<IconRefresh size={14} stroke={1.9} />}
                >
                  {t("wh_reset")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && winner && (
        <div className="wheel-modal" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="wheel-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="wheel-modal-x" onClick={closeModal} aria-label="Close">
              <IconX size={16} stroke={2} />
            </button>
            <div className="wheel-modal-emoji" style={{ color: "#f59e0b" }}>
              <IconConfetti size={54} stroke={1.6} />
            </div>
            <div className="wheel-modal-title">{t("wh_winner_title")}</div>
            <div className="wheel-modal-name">{winner}</div>
            <div className="wheel-modal-actions">
              <Button variant="subtle" size="sm" onClick={closeModal}>
                {t("wh_winner_close")}
              </Button>
              <Button onClick={spinAgain} leftIcon={<IconPlayerPlayFilled size={14} />}>
                {t("wh_spin_again")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
