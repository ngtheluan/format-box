"use client";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { canChiOfDay, canChiOfMonth, canChiOfYear, solarToLunar } from "@/lib/lunar";
import { IconCalendarEvent, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useMemo, useState } from "react";

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

  const goPrev = () => setView(new Date(year, month - 1, 1));
  const goNext = () => setView(new Date(year, month + 1, 1));
  const goToday = () => {
    const n = new Date();
    setView(new Date(n.getFullYear(), n.getMonth(), 1));
    setSelected(n);
  };

  const selLunar = solarToLunar(selected.getDate(), selected.getMonth() + 1, selected.getFullYear());
  const selHoliday = holidayOf(selected, selLunar);
  const selCanChiDay = canChiOfDay(selected.getDate(), selected.getMonth() + 1, selected.getFullYear());
  const selCanChiMonth = canChiOfMonth(selLunar.month, selLunar.year);
  const selCanChiYear = canChiOfYear(selLunar.year);
  const weekdays = lang === "vi" ? WEEKDAYS_VI : WEEKDAYS_EN;
  const monthLabel = view.toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { month: "long", year: "numeric" });
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
            <button className="cal-nav" onClick={goPrev} aria-label="Prev">
              <IconChevronLeft size={18} />
            </button>
            <div className="cal-title">{monthLabel}</div>
            <button className="cal-nav" onClick={goNext} aria-label="Next">
              <IconChevronRight size={18} />
            </button>
            <Button onClick={goToday} leftIcon={<IconCalendarEvent size={13} stroke={2} />}>
              {t("cal_today")}
            </Button>
          </div>

          <div className="cal-grid cal-weekhead">
            {weekdays.map((w, i) => (
              <div key={w} className={`cal-wd${i === 0 ? " sun" : ""}`}>
                {w}
              </div>
            ))}
          </div>

          <div className="cal-grid">
            {cells.map(({ date, inMonth }, i) => {
              const lu = solarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
              const isToday = sameDate(date, today);
              const isSel = sameDate(date, selected);
              const isSun = date.getDay() === 0;
              const holiday = holidayOf(date, lu);
              const showLunarMonth = lu.day === 1;
              const lunarText = showLunarMonth ? `${lu.day}/${lu.month}${lu.leap ? "*" : ""}` : String(lu.day);
              return (
                <button
                  key={i}
                  className={`cal-cell${inMonth ? "" : " off"}${isToday ? " today" : ""}${isSel ? " sel" : ""}${isSun ? " sun" : ""}${holiday ? " holiday" : ""}`}
                  onClick={() => setSelected(date)}
                  title={holiday || undefined}
                >
                  <div className="cal-solar">{date.getDate()}</div>
                  <div className={`cal-lunar${showLunarMonth ? " strong" : ""}`}>{lunarText}</div>
                  {holiday && <span className="cal-holiday-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
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

          <p className="cal-hint">{t("cal_hint")}</p>
        </aside>
      </div>
    </div>
  );
}
