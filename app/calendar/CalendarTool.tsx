"use client";
import { Button, Modal, Switch } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { canChiOfDay, canChiOfMonth, canChiOfYear, solarToLunar } from "@/lib/lunar";
import {
  IconBell,
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Priority = "high" | "med" | "low";
type CalEvent = {
  id: string;
  title: string;
  date: string; // start YYYY-MM-DD
  endDate: string; // end YYYY-MM-DD (same as date for single-day)
  time: string; // start HH:MM or ""
  endTime: string; // end HH:MM or ""
  allDay: boolean;
  note: string;
  priority: Priority;
  remind: boolean;
};

const EVENTS_KEY = "fb-calendar-events";

function dateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

function loadEvents(): CalEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Partial<CalEvent>[];
    return list.map((e) => ({
      id: e.id || uid(),
      title: e.title || "",
      date: e.date || "",
      endDate: e.endDate || e.date || "",
      time: e.time || "",
      endTime: e.endTime || "",
      allDay: !!e.allDay,
      note: e.note || "",
      priority: (e.priority as Priority) || "med",
      remind: !!e.remind,
    }));
  } catch {
    return [];
  }
}
function saveEvents(list: CalEvent[]) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const WEEKDAYS_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SOLAR_HOLIDAYS: Record<string, string> = {
  "1-1": "Tết Dương lịch",
  "2-3": "Thành lập Đảng CSVN",
  "2-14": "Lễ Tình nhân (Valentine)",
  "2-27": "Thầy thuốc Việt Nam",
  "3-8": "Quốc tế Phụ nữ",
  "3-26": "Thành lập Đoàn TNCS",
  "4-1": "Cá tháng Tư",
  "4-30": "Giải phóng miền Nam",
  "5-1": "Quốc tế Lao động",
  "5-7": "Chiến thắng Điện Biên Phủ",
  "5-13": "Ngày của Mẹ",
  "5-19": "Sinh nhật Bác Hồ",
  "6-1": "Quốc tế Thiếu nhi",
  "6-17": "Ngày của Cha",
  "6-21": "Báo chí Cách mạng VN",
  "6-28": "Gia đình Việt Nam",
  "7-27": "Thương binh Liệt sĩ",
  "7-28": "Thành lập Công đoàn VN",
  "8-19": "Cách mạng Tháng Tám",
  "9-2": "Quốc khánh",
  "9-10": "Thành lập MTTQ VN",
  "10-10": "Giải phóng Thủ đô",
  "10-13": "Doanh nhân Việt Nam",
  "10-20": "Phụ nữ Việt Nam",
  "10-31": "Halloween",
  "11-9": "Pháp luật Việt Nam",
  "11-20": "Nhà giáo Việt Nam",
  "11-24": "Ngày Văn hóa Việt Nam",
  "12-19": "Toàn quốc kháng chiến",
  "12-22": "Quân đội Nhân dân VN",
  "12-24": "Đêm Giáng sinh",
  "12-25": "Lễ Giáng sinh (Noel)",
  "12-31": "Tất niên Dương lịch",
};

const LUNAR_HOLIDAYS: Record<string, string> = {
  "1-1": "Tết Nguyên Đán",
  "1-2": "Mùng 2 Tết",
  "1-3": "Mùng 3 Tết",
  "1-15": "Rằm tháng Giêng",
  "3-3": "Tết Hàn thực",
  "3-10": "Giỗ Tổ Hùng Vương",
  "4-15": "Lễ Phật Đản",
  "5-5": "Tết Đoan Ngọ",
  "7-7": "Thất Tịch",
  "7-15": "Lễ Vu Lan",
  "8-15": "Tết Trung Thu",
  "9-9": "Tết Trùng Cửu",
  "10-10": "Tết Trùng Thập",
  "12-8": "Lễ Thành Đạo",
  "12-23": "Ông Công Ông Táo",
  "12-30": "Tất niên",
};

function holidayOf(date: Date, lu: { day: number; month: number }): string | null {
  return (
    SOLAR_HOLIDAYS[`${date.getMonth() + 1}-${date.getDate()}`] ||
    LUNAR_HOLIDAYS[`${lu.month}-${lu.day}`] ||
    null
  );
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarTool() {
  const { t, lang } = useI18n();
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);
  const [mode, setMode] = useState<"month" | "year">("month");

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [form, setForm] = useState<CalEvent>({
    id: "",
    title: "",
    date: dateKey(today),
    endDate: dateKey(today),
    time: "",
    endTime: "",
    allDay: true,
    note: "",
    priority: "med",
    remind: false,
  });

  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  const firedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    const timers: number[] = [];
    const now = Date.now();
    for (const ev of events) {
      if (!ev.remind) continue;
      const [y, m, d] = ev.date.split("-").map(Number);
      if (!y) continue;
      const [hh, mm] = ev.allDay || !ev.time ? [9, 0] : ev.time.split(":").map(Number);
      const when = new Date(y, m - 1, d, hh || 0, mm || 0, 0).getTime();
      const delay = when - now;
      const key = `${ev.id}@${when}`;
      if (delay <= 0 || delay > 24 * 3600 * 1000) continue;
      if (firedRef.current.has(key)) continue;
      const id = window.setTimeout(() => {
        firedRef.current.add(key);
        if (Notification.permission === "granted") {
          try {
            new Notification(ev.title, {
              body: ev.allDay
                ? ev.note || ""
                : `${ev.time}${ev.endTime ? ` → ${ev.endTime}` : ""}${ev.note ? ` · ${ev.note}` : ""}`,
              tag: ev.id,
            });
          } catch {}
        }
      }, delay);
      timers.push(id);
    }
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [events]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) {
      const end = e.endDate || e.date;
      const [sy, sm, sd] = e.date.split("-").map(Number);
      const [ey, em, ed] = end.split("-").map(Number);
      if (!sy || !ey) continue;
      const cur = new Date(sy, sm - 1, sd);
      const endD = new Date(ey, em - 1, ed);
      let guard = 0;
      while (cur <= endD && guard++ < 400) {
        const key = dateKey(cur);
        const l = m.get(key);
        if (l) l.push(e);
        else m.set(key, [e]);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return m;
  }, [events]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      id: "",
      title: "",
      date: dateKey(selected),
      endDate: dateKey(selected),
      time: "",
      endTime: "",
      allDay: true,
      note: "",
      priority: "med",
      remind: false,
    });
    setModalOpen(true);
  };
  const openEdit = (ev: CalEvent) => {
    setEditing(ev);
    setForm({ ...ev });
    setModalOpen(true);
  };
  const saveForm = () => {
    const title = form.title.trim();
    if (!title) return;
    const endDate = form.allDay
      ? form.date
      : form.endDate && form.endDate >= form.date
        ? form.endDate
        : form.date;
    const sameDay = endDate === form.date;
    const next: CalEvent = {
      id: editing?.id || uid(),
      title,
      date: form.date,
      endDate,
      time: form.allDay ? "" : form.time,
      endTime: form.allDay
        ? ""
        : sameDay
          ? form.endTime && form.time && form.endTime > form.time
            ? form.endTime
            : ""
          : form.endTime,
      allDay: form.allDay,
      note: form.note.trim(),
      priority: form.priority,
      remind: form.remind,
    };
    const list = editing ? events.map((e) => (e.id === editing.id ? next : e)) : [...events, next];
    setEvents(list);
    saveEvents(list);
    setModalOpen(false);
    const [y, m, d] = next.date.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    setSelected(target);
    setView(new Date(y, m - 1, 1));
  };
  const deleteEvent = (id: string) => {
    if (!confirm(t("cal_ev_confirm_del"))) return;
    const list = events.filter((e) => e.id !== id);
    setEvents(list);
    saveEvents(list);
    if (editing?.id === id) setModalOpen(false);
  };

  const year = view.getFullYear();
  const month = view.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = daysInPrev - startWeekday + 1 + i;
    cells.push({ date: new Date(year, month - 1, d), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const nxt = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({ date: nxt, inMonth: nxt.getMonth() === month });
  }

  const goPrev = () => {
    if (mode === "year") setView(new Date(year - 1, 0, 1));
    else setView(new Date(year, month - 1, 1));
  };
  const goNext = () => {
    if (mode === "year") setView(new Date(year + 1, 0, 1));
    else setView(new Date(year, month + 1, 1));
  };
  const goToday = () => {
    const n = new Date();
    setView(n);
    setSelected(n);
  };

  const selLunar = solarToLunar(selected.getDate(), selected.getMonth() + 1, selected.getFullYear());
  const selHoliday = holidayOf(selected, selLunar);
  const selCanChiDay = canChiOfDay(selected.getDate(), selected.getMonth() + 1, selected.getFullYear());
  const selCanChiMonth = canChiOfMonth(selLunar.month, selLunar.year);
  const selCanChiYear = canChiOfYear(selLunar.year);
  const weekdays = lang === "vi" ? WEEKDAYS_VI : WEEKDAYS_EN;
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const headLabel =
    mode === "year"
      ? String(view.getFullYear())
      : view.toLocaleString(locale, { month: "long", year: "numeric" });
  const selLabel = selected.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="cal-wrap">
        <div className="cal-main">
          <div className="cal-head">
            <div className="cal-head-left">
              <Button size="sm" variant="ghost" onClick={goToday} leftIcon={<IconCalendarEvent size={13} stroke={2} />}>
                {t("cal_today")}
              </Button>
            </div>
            <div className="cal-head-center">
              <button className="cal-nav" onClick={goPrev} aria-label="Prev">
                <IconChevronLeft size={18} />
              </button>
              <div className="cal-title">{headLabel}</div>
              <button className="cal-nav" onClick={goNext} aria-label="Next">
                <IconChevronRight size={18} />
              </button>
            </div>
            <div className="cal-head-right">
              <div className="cal-seg" role="tablist">
                {(["month", "year"] as const).map((m) => (
                  <button
                    key={m}
                    className={mode === m ? "active" : ""}
                    onClick={() => setMode(m)}
                    role="tab"
                    aria-selected={mode === m}
                  >
                    {t(`cal_view_${m}` as "cal_view_month" | "cal_view_year")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {mode !== "year" && (
            <div className="cal-grid cal-weekhead">
              {weekdays.map((w, i) => (
                <div key={w} className={`cal-wd${i === 0 ? " sun" : ""}`}>
                  {w}
                </div>
              ))}
            </div>
          )}

          {mode === "month" && (
            <div className="cal-month">
              {Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7)).map((week, wi) => {
                const weekStart = week[0].date;
                const weekEnd = week[6].date;
                const weekStartMs = new Date(
                  weekStart.getFullYear(),
                  weekStart.getMonth(),
                  weekStart.getDate(),
                ).getTime();
                const weekEndMs = new Date(
                  weekEnd.getFullYear(),
                  weekEnd.getMonth(),
                  weekEnd.getDate(),
                ).getTime();

                type Bar = {
                  ev: CalEvent;
                  startCol: number;
                  endCol: number;
                  contL: boolean;
                  contR: boolean;
                };
                const bars: Bar[] = [];
                for (const ev of events) {
                  if (!ev.endDate || ev.endDate === ev.date) continue;
                  const [sy, sm, sd] = ev.date.split("-").map(Number);
                  const [ey, em, ed] = ev.endDate.split("-").map(Number);
                  const sMs = new Date(sy, sm - 1, sd).getTime();
                  const eMs = new Date(ey, em - 1, ed).getTime();
                  if (eMs < weekStartMs || sMs > weekEndMs) continue;
                  const effS = Math.max(sMs, weekStartMs);
                  const effE = Math.min(eMs, weekEndMs);
                  const startCol = Math.round((effS - weekStartMs) / 86400000);
                  const endCol = Math.round((effE - weekStartMs) / 86400000);
                  bars.push({
                    ev,
                    startCol,
                    endCol,
                    contL: sMs < weekStartMs,
                    contR: eMs > weekEndMs,
                  });
                }
                // greedy lane assignment
                const lanes: number[][] = [];
                const laneOf = new Map<number, number>();
                bars.sort((a, b) => a.startCol - b.startCol || b.endCol - a.endCol);
                bars.forEach((b, idx) => {
                  let placed = -1;
                  for (let l = 0; l < lanes.length; l++) {
                    if (lanes[l].every((i) => bars[i].endCol < b.startCol)) {
                      lanes[l].push(idx);
                      placed = l;
                      break;
                    }
                  }
                  if (placed < 0) {
                    lanes.push([idx]);
                    placed = lanes.length - 1;
                  }
                  laneOf.set(idx, placed);
                });
                const laneH = 20;
                const laneCount = lanes.length;

                return (
                  <div
                    key={wi}
                    className="cal-week"
                    style={{ minHeight: `calc(68px + ${laneCount * laneH}px)` }}
                  >
                    <div className="cal-week-days">
                      {week.map(({ date, inMonth }, i) => {
                        const lu = solarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
                        const isToday = sameDate(date, today);
                        const isSel = sameDate(date, selected);
                        const isSun = date.getDay() === 0;
                        const holiday = holidayOf(date, lu);
                        const showLunarMonth = lu.day === 1;
                        const lunarText = showLunarMonth
                          ? `${lu.day}/${lu.month}${lu.leap ? "*" : ""}`
                          : String(lu.day);
                        const dayEvents = eventsByDay.get(dateKey(date));
                        const singleDayEvents = dayEvents?.filter(
                          (e) => !e.endDate || e.endDate === e.date,
                        );
                        return (
                          <button
                            key={i}
                            className={`cal-cell${inMonth ? "" : " off"}${isToday ? " today" : ""}${isSel ? " sel" : ""}${isSun ? " sun" : ""}${holiday ? " holiday" : ""}`}
                            onClick={() => setSelected(date)}
                            style={{ paddingBottom: 4 + laneCount * laneH }}
                            title={
                              [holiday, dayEvents?.map((e) => e.title).join(" · ")]
                                .filter(Boolean)
                                .join(" · ") || undefined
                            }
                          >
                            <div className="cal-chip">
                              <div className="cal-solar">{date.getDate()}</div>
                            </div>
                            <div className={`cal-lunar${showLunarMonth ? " strong" : ""}`}>{lunarText}</div>
                            {holiday && <span className="cal-holiday-dot" aria-hidden="true" title={holiday} />}
                            {singleDayEvents && singleDayEvents.length > 0 && (
                              <span
                                className={`cal-event-dot pri-${
                                  singleDayEvents.some((e) => e.priority === "high")
                                    ? "high"
                                    : singleDayEvents.some((e) => e.priority === "med")
                                      ? "med"
                                      : "low"
                                }`}
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="cal-week-bars" style={{ height: laneCount * laneH }}>
                      {bars.map((b, idx) => {
                        const lane = laneOf.get(idx) ?? 0;
                        const left = `calc(${b.startCol} * (100% / 7) + 3px)`;
                        const width = `calc(${b.endCol - b.startCol + 1} * (100% / 7) - 6px)`;
                        return (
                          <div
                            key={`${b.ev.id}-${idx}`}
                            className={`cal-bar pri-${b.ev.priority}${!b.contL ? " round-l" : " cont-l"}${!b.contR ? " round-r" : ""}`}
                            style={{
                              top: lane * laneH,
                              left,
                              width,
                            }}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              const [y, m, d] = b.ev.date.split("-").map(Number);
                              setSelected(new Date(y, m - 1, d));
                              openEdit(b.ev);
                            }}
                            title={b.ev.title}
                          >
                            {!b.contL && (
                              <span className="cal-bar-ico" aria-hidden="true">
                                <IconCalendarEvent size={10} stroke={2.4} />
                              </span>
                            )}
                            <span className="cal-bar-title">{b.ev.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mode === "year" && (
            <div className="cal-year">
              {Array.from({ length: 12 }, (_, mi) => mi).map((mi) => {
                const first = new Date(year, mi, 1);
                const sw = first.getDay();
                const dim = new Date(year, mi + 1, 0).getDate();
                const dp = new Date(year, mi, 0).getDate();
                const mcells: { date: Date; inMonth: boolean }[] = [];
                for (let i = 0; i < sw; i++) mcells.push({ date: new Date(year, mi - 1, dp - sw + 1 + i), inMonth: false });
                for (let d = 1; d <= dim; d++) mcells.push({ date: new Date(year, mi, d), inMonth: true });
                while (mcells.length < 42) {
                  const last = mcells[mcells.length - 1].date;
                  const nxt = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
                  mcells.push({ date: nxt, inMonth: nxt.getMonth() === mi });
                }
                return (
                  <div
                    key={mi}
                    className="cal-mini"
                    onClick={() => {
                      setView(new Date(year, mi, 1));
                      setMode("month");
                    }}
                  >
                    <div className="cal-mini-h">
                      {first.toLocaleString(locale, { month: "long" })}
                    </div>
                    <div className="cal-mini-grid">
                      {weekdays.map((w, i) => (
                        <div key={`wd${i}`} className="cal-mini-wd">{w.slice(0, lang === "vi" ? 2 : 1)}</div>
                      ))}
                      {mcells.map(({ date, inMonth }, i) => {
                        const lu = solarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
                        const isToday = sameDate(date, today);
                        const isSel = sameDate(date, selected);
                        const holiday = holidayOf(date, lu);
                        const has = eventsByDay.has(dateKey(date));
                        const cls = [
                          "cal-mini-d",
                          !inMonth && "off",
                          isToday && "today",
                          isSel && "sel",
                          holiday && "hol",
                          has && "has",
                        ].filter(Boolean).join(" ");
                        return (
                          <div
                            key={i}
                            className={cls}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelected(date);
                              setView(new Date(date.getFullYear(), date.getMonth(), 1));
                              setMode("month");
                            }}
                          >
                            {date.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="cal-side">
          <div className="cal-side-head">{selLabel}</div>
          <div className="cal-big">
            <div className="cal-big-num">{selected.getDate()}</div>
            <div className="cal-big-lbl">
              {t("cal_solar")} · {selected.getMonth() + 1}/{selected.getFullYear()}
            </div>
          </div>

          {selHoliday && <div className="cal-holiday-badge">{selHoliday}</div>}

          <div className="cal-lunar-card">
            <div className="cal-lu-row">
              <span>{t("cal_lunar")}</span>
              <b>
                {selLunar.day}/{selLunar.month}
                {selLunar.leap ? ` (${t("cal_leap")})` : ""}/{selLunar.year}
              </b>
            </div>
            <div className="cal-lu-row">
              <span>{t("cal_day")}</span>
              <b>{selCanChiDay}</b>
            </div>
            <div className="cal-lu-row">
              <span>{t("cal_month")}</span>
              <b>{selCanChiMonth}</b>
            </div>
            <div className="cal-lu-row">
              <span>{t("cal_year")}</span>
              <b>{selCanChiYear}</b>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="apcal-header">
              <strong>{t("cal_events")}</strong>
              <Button size="sm" onClick={openAdd} leftIcon={<IconPlus size={13} stroke={2} />}>
                {t("cal_ev_add")}
              </Button>
            </div>
            {(() => {
              const list = (eventsByDay.get(dateKey(selected)) || [])
                .slice()
                .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
              if (list.length === 0)
                return <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("cal_ev_empty")}</div>;
              return (
                <ul className="apcal-list" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {list.map((e) => (
                    <li key={e.id} className={`apcal-row apcal-pri-${e.priority}`}>
                      <div className="apcal-row-time">
                        {(() => {
                          const selKey = dateKey(selected);
                          const isStart = e.date === selKey;
                          const isEnd = (e.endDate || e.date) === selKey;
                          const multi = e.endDate && e.endDate !== e.date;
                          if (e.allDay || !e.time) {
                            return <b style={{ fontSize: 11 }}>{t("cal_ev_allday")}</b>;
                          }
                          if (multi) {
                            if (isStart) return <><b>{e.time}</b><span style={{ fontSize: 10 }}>→ {e.endDate}</span></>;
                            if (isEnd) return <><b>{e.endTime || "—"}</b><span style={{ fontSize: 10 }}>{t("cal_ev_end").toLowerCase()}</span></>;
                            return <b style={{ fontSize: 11 }}>•••</b>;
                          }
                          return <><b>{e.time}</b>{e.endTime && <span style={{ fontSize: 10 }}>→ {e.endTime}</span>}</>;
                        })()}
                      </div>
                      <div className="apcal-row-body">
                        <div className="apcal-row-title">{e.title}</div>
                        {e.note && <div className="apcal-row-note">{e.note}</div>}
                        {e.remind && (
                          <span className="apcal-badge-remind">
                            <IconBell size={10} stroke={2.2} />
                            {t("cal_ev_remind")}
                          </span>
                        )}
                      </div>
                      <div className="apcal-row-act">
                        <button onClick={() => openEdit(e)} aria-label="edit">
                          <IconPencil size={14} stroke={2} />
                        </button>
                        <button className="apcal-del" onClick={() => deleteEvent(e.id)} aria-label="delete">
                          <IconTrash size={14} stroke={2} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>

          <p className="cal-hint">{t("cal_hint")}</p>
        </aside>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("cal_ev_edit") : t("cal_ev_add")}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
            {editing && (
              <Button variant="ghost" onClick={() => deleteEvent(editing.id)} leftIcon={<IconTrash size={13} stroke={2} />}>
                {t("cal_ev_delete")}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              {t("cal_ev_cancel")}
            </Button>
            <Button onClick={saveForm} disabled={!form.title.trim()}>
              {t("cal_ev_save")}
            </Button>
          </div>
        }
      >
        <div className="apcal-form">
          <input
            className="apcal-title-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={t("cal_ev_title_ph")}
            autoFocus
          />

          <div className="apcal-pri-pick">
            {(["high", "med", "low"] as const).map((p) => (
              <button
                key={p}
                className={`apcal-pri-${p}${form.priority === p ? " active" : ""}`}
                onClick={() => setForm({ ...form, priority: p })}
                type="button"
              >
                <span className="apcal-pri-dot" />
                {t(`cal_pri_${p}` as "cal_pri_high" | "cal_pri_med" | "cal_pri_low")}
              </button>
            ))}
          </div>

          <div className="apcal-group">
            <div className="apcal-item">
              <span className="apcal-item-label">{t("cal_ev_allday")}</span>
              <div className="apcal-item-control">
                <Switch
                  checked={form.allDay}
                  onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
                />
              </div>
            </div>
            {form.allDay ? (
              <div className="apcal-item">
                <span className="apcal-item-label">{t("cal_ev_date")}</span>
                <div className="apcal-item-control">
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="apcal-item">
                  <span className="apcal-item-label">{t("cal_ev_start")}</span>
                  <div className="apcal-item-control">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm({
                          ...form,
                          date: v,
                          endDate: form.endDate && form.endDate >= v ? form.endDate : v,
                        });
                      }}
                    />
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="apcal-item">
                  <span className="apcal-item-label">{t("cal_ev_end")}</span>
                  <div className="apcal-item-control">
                    <input
                      type="date"
                      value={form.endDate}
                      min={form.date || undefined}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                    <input
                      type="time"
                      value={form.endTime}
                      min={form.endDate === form.date ? form.time || undefined : undefined}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="apcal-group">
            <div className="apcal-item">
              <span className="apcal-item-label" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <IconBell size={14} stroke={2} />
                {t("cal_ev_remind")}
              </span>
              <div className="apcal-item-control">
                <Switch
                  checked={form.remind}
                  onChange={async (e) => {
                    const on = e.target.checked;
                    if (on && typeof Notification !== "undefined") {
                      if (Notification.permission === "default") {
                        const p = await Notification.requestPermission();
                        if (p !== "granted") {
                          alert(t("cal_remind_denied"));
                          return;
                        }
                      } else if (Notification.permission === "denied") {
                        alert(t("cal_remind_denied"));
                        return;
                      }
                    }
                    setForm({ ...form, remind: on });
                  }}
                />
              </div>
            </div>
          </div>

          <textarea
            className="apcal-note"
            rows={3}
            placeholder={t("cal_ev_note")}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
