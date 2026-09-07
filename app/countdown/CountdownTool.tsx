"use client";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { IconCake, IconChristmasTree, IconDeviceFloppy, IconGift, IconPlus, IconSparkles, IconTrash } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";

type Countdown = {
  id: string;
  title: string;
  target: string; // ISO string
  color: string;
};

const STORAGE_KEY = "fb-countdowns";
const ACTIVE_KEY = "fb-countdown-active";

const COLORS = ["#6366f1", "#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#a78bfa"];

function nextYearIso() {
  const d = new Date();
  return new Date(d.getFullYear() + 1, 0, 1, 0, 0, 0).toISOString();
}
function xmasIso() {
  const d = new Date();
  const year = d.getMonth() > 11 || (d.getMonth() === 11 && d.getDate() > 25) ? d.getFullYear() + 1 : d.getFullYear();
  return new Date(year, 11, 25, 0, 0, 0).toISOString();
}
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string) {
  const d = new Date(v);
  return d.toISOString();
}

function diff(target: number, now: number) {
  const ms = Math.max(0, target - now);
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { ms, days, hours, minutes, seconds };
}

export default function CountdownTool() {
  const toast = useToast();
  const { t } = useI18n();

  const [list, setList] = useState<Countdown[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [ready, setReady] = useState(false);
  const celebratedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Countdown[]) : [];
      const seeded =
        parsed.length > 0
          ? parsed
          : [
              { id: "seed-ny", title: t("cd_preset_ny"), target: nextYearIso(), color: COLORS[0] },
              { id: "seed-xm", title: t("cd_preset_xmas"), target: xmasIso(), color: COLORS[2] },
            ];
      setList(seeded);
      const savedActive = localStorage.getItem(ACTIVE_KEY);
      setActiveId(savedActive && seeded.find((c) => c.id === savedActive) ? savedActive : (seeded[0]?.id ?? null));
    } catch {
      /* ignore */
    } finally {
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }, [list, ready]);
  useEffect(() => {
    if (!ready || !activeId) return;
    try {
      localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {
      /* ignore */
    }
  }, [activeId, ready]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = useMemo(() => list.find((c) => c.id === activeId) ?? null, [list, activeId]);
  const d = useMemo(() => (active ? diff(new Date(active.target).getTime(), now) : null), [active, now]);
  const finished = d ? d.ms === 0 : false;

  useEffect(() => {
    if (!active || !finished) return;
    if (celebratedRef.current.has(active.id)) return;
    celebratedRef.current.add(active.id);
    import("canvas-confetti")
      .then((m) => {
        m.default({ particleCount: 160, spread: 90, origin: { y: 0.4 }, zIndex: 9999 });
      })
      .catch(() => undefined);
  }, [active, finished]);

  const addCountdown = (title: string, target: string) => {
    const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const color = COLORS[list.length % COLORS.length];
    const next: Countdown = { id, title, target, color };
    setList((prev) => [next, ...prev]);
    setActiveId(id);
    celebratedRef.current.delete(id);
  };

  const removeCountdown = (id: string) => {
    setList((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
    celebratedRef.current.delete(id);
  };

  const updateActive = (patch: Partial<Countdown>) => {
    if (!activeId) return;
    setList((prev) => prev.map((c) => (c.id === activeId ? { ...c, ...patch } : c)));
    if (patch.target) celebratedRef.current.delete(activeId);
  };

  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState<string>(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    d.setSeconds(0, 0);
    return toLocalInput(d.toISOString());
  });

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      toast(t("cd_need_title"));
      return;
    }
    if (!newTarget) {
      toast(t("cd_need_date"));
      return;
    }
    const iso = fromLocalInput(newTarget);
    if (new Date(iso).getTime() <= Date.now()) {
      toast(t("cd_need_future"));
      return;
    }
    addCountdown(title, iso);
    setNewTitle("");
  };

  const addPreset = (kind: "ny" | "xmas" | "birthday") => {
    if (kind === "ny") addCountdown(t("cd_preset_ny"), nextYearIso());
    else if (kind === "xmas") addCountdown(t("cd_preset_xmas"), xmasIso());
    else {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      d.setHours(0, 0, 0, 0);
      addCountdown(t("cd_preset_birthday"), d.toISOString());
    }
  };

  return (
    <div className="wheel-layout">
      <aside className="wheel-side">
        <div className="wheel-preset-head">{t("cd_new")}</div>
        <form className="cd-form" onSubmit={submitNew}>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t("cd_title_ph")}
            maxLength={60}
          />
          <Input
            type="datetime-local"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
          />
          <Button type="submit" block leftIcon={<IconPlus size={14} stroke={2} />}>
            {t("cd_add")}
          </Button>
        </form>

        <div className="wheel-preset-head" style={{ marginTop: 14 }}>
          {t("cd_presets")}
        </div>
        <div className="wheel-presets">
          <button type="button" className="wheel-preset" onClick={() => addPreset("ny")}>
            <IconSparkles size={14} stroke={1.9} />
            <span>{t("cd_preset_ny")}</span>
          </button>
          <button type="button" className="wheel-preset" onClick={() => addPreset("xmas")}>
            <IconChristmasTree size={14} stroke={1.9} />
            <span>{t("cd_preset_xmas")}</span>
          </button>
          <button type="button" className="wheel-preset" onClick={() => addPreset("birthday")}>
            <IconCake size={14} stroke={1.9} />
            <span>{t("cd_preset_birthday")}</span>
          </button>
        </div>

        <div className="wheel-history" style={{ marginTop: 18 }}>
          <div className="wheel-history-head">
            <span>{t("cd_list")}</span>
            <span>
              {list.length} {t("cd_count")}
            </span>
          </div>
          {list.length === 0 ? (
            <div className="wheel-history-empty">{t("cd_list_empty")}</div>
          ) : (
            <ul className="cd-list">
              {list.map((c) => {
                const dd = diff(new Date(c.target).getTime(), now);
                const done = dd.ms === 0;
                return (
                  <li key={c.id} className={`cd-item${c.id === activeId ? " on" : ""}`}>
                    <button className="cd-item-main" onClick={() => setActiveId(c.id)}>
                      <span className="cd-dot" style={{ background: c.color }} />
                      <span className="cd-item-title" title={c.title}>
                        {c.title}
                      </span>
                      <span className="cd-item-meta">{done ? t("cd_done") : `${dd.days}${t("cd_short_d")}`}</span>
                    </button>
                    <button
                      type="button"
                      className="cd-item-x"
                      onClick={() => removeCountdown(c.id)}
                      aria-label="Remove"
                    >
                      <IconTrash size={13} stroke={1.9} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="wheel-saved-hint" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <IconDeviceFloppy size={14} stroke={1.8} /> {t("cd_saved_hint")}
        </p>
      </aside>

      <div className="wheel-stage">
        {active && d ? (
          <>
            <div className="cd-active-head">
              <input
                className="cd-active-title"
                value={active.title}
                onChange={(e) => updateActive({ title: e.target.value })}
                placeholder={t("cd_title_ph")}
              />
              <input
                className="cd-active-date"
                type="datetime-local"
                value={toLocalInput(active.target)}
                onChange={(e) => updateActive({ target: fromLocalInput(e.target.value) })}
              />
            </div>

            {finished ? (
              <div className="cd-done-card">
                <div className="cd-done-emoji">
                  <IconGift size={44} stroke={1.6} />
                </div>
                <div className="cd-done-title">{t("cd_arrived")}</div>
                <div className="cd-done-sub">{active.title}</div>
              </div>
            ) : (
              <div className="cd-digits">
                {[
                  { v: d.days, l: t("cd_unit_d") },
                  { v: d.hours, l: t("cd_unit_h") },
                  { v: d.minutes, l: t("cd_unit_m") },
                  { v: d.seconds, l: t("cd_unit_s") },
                ].map((u) => (
                  <div key={u.l} className="cd-cell" style={{ borderColor: active.color }}>
                    <div className="cd-num" style={{ color: active.color }}>
                      {String(u.v).padStart(2, "0")}
                    </div>
                    <div className="cd-lbl">{u.l}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="cd-target-hint">
              {t("cd_target")}: <b>{new Date(active.target).toLocaleString()}</b>
            </div>
          </>
        ) : (
          <div className="wheel-empty">{t("cd_empty")}</div>
        )}
      </div>
    </div>
  );
}
