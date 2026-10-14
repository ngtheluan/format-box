"use client";
import { useI18n } from "@/lib/i18n";
import {
  IconBeach,
  IconBuildingArch,
  IconBuildingCommunity,
  IconCalendarEvent,
  IconCar,
  IconMapPin,
  IconMountain,
  IconRoute,
  IconSparkles,
  IconToolsKitchen2,
} from "@tabler/icons-react";
import { forwardRef, type CSSProperties } from "react";
import { countStops, proxiedImage, tripDayCount, type StopCategory, type Trip } from "./shared";

const CAT_ICON: Record<StopCategory, typeof IconMapPin> = {
  sight: IconBuildingArch,
  eat: IconToolsKitchen2,
  stay: IconBuildingCommunity,
  beach: IconBeach,
  mountain: IconMountain,
  activity: IconSparkles,
  transport: IconCar,
  other: IconMapPin,
};

function fmtDate(value: string | undefined, locale: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);
}

type Props = { trip: Trip; shareUrl?: string };

// The themed, exportable itinerary card. Shared by the builder preview and the
// public share-link viewer. Colours derive from a single --trip-accent token.
const TripCard = forwardRef<HTMLDivElement, Props>(function TripCard({ trip, shareUrl }, ref) {
  const { t, lang } = useI18n();
  const locale = lang === "vi" ? "vi-VN" : "en-US";

  const dayCount = tripDayCount(trip);
  const stops = countStops(trip);
  const range =
    trip.startDate && trip.endDate
      ? `${fmtDate(trip.startDate, locale)} – ${fmtDate(trip.endDate, locale)}`
      : fmtDate(trip.startDate, locale);

  const visibleDays = trip.days.filter((d) => d.stops.some((s) => s.name.trim()) || d.title?.trim());

  return (
    <div ref={ref} className="trip-card" style={{ "--trip-accent": trip.accent } as CSSProperties}>
      <div className={`trip-card-head ${trip.cover ? "has-cover" : ""}`}>
        {trip.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="trip-card-cover" src={proxiedImage(trip.cover)} alt="" crossOrigin="anonymous" />
        )}
        <div className="trip-card-head-body">
          <div className="trip-card-eyebrow">
            <IconRoute size={15} stroke={2} />
            <span>{t("trip_card_eyebrow")}</span>
          </div>
          <h2 className="trip-card-title">{trip.title || t("trip_untitled")}</h2>
          {trip.subtitle && <div className="trip-card-sub">{trip.subtitle}</div>}
          <div className="trip-card-meta">
            {range && (
              <span className="trip-chip">
                <IconCalendarEvent size={14} stroke={2} />
                {range}
              </span>
            )}
            <span className="trip-chip">
              {dayCount} {t("trip_unit_days")}
            </span>
            <span className="trip-chip">
              {stops} {t("trip_unit_stops")}
            </span>
          </div>
        </div>
      </div>

      <div className="trip-card-body">
        {visibleDays.length === 0 && <div className="trip-card-empty">{t("trip_empty_preview")}</div>}
        {visibleDays.map((day, di) => {
          const dayStops = day.stops.filter((s) => s.name.trim());
          return (
            <div className="trip-day" key={day.id}>
              <div className="trip-day-head">
                <span className="trip-day-num">{di + 1}</span>
                <div className="trip-day-titles">
                  <strong>
                    {t("trip_day")} {di + 1}
                    {day.date ? ` · ${fmtDate(day.date, locale)}` : ""}
                  </strong>
                  {day.title && <span>{day.title}</span>}
                </div>
              </div>
              <div className="trip-stops">
                {dayStops.map((stop) => {
                  const Icon = CAT_ICON[stop.category ?? "other"];
                  return (
                    <div className="trip-stop" key={stop.id}>
                      <div className="trip-stop-rail">
                        <span className="trip-stop-dot">
                          <Icon size={13} stroke={2} />
                        </span>
                      </div>
                      <div className="trip-stop-main">
                        {stop.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="trip-stop-img"
                            src={proxiedImage(stop.image)}
                            alt=""
                            crossOrigin="anonymous"
                          />
                        )}
                        <div className="trip-stop-text">
                          <div className="trip-stop-name">
                            {stop.time && <span className="trip-stop-time">{stop.time}</span>}
                            {stop.name}
                          </div>
                          {stop.note && <div className="trip-stop-note">{stop.note}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="trip-card-foot">
        <span>{t("trip_powered")}</span>
        {shareUrl && <span className="trip-card-foot-url">{shareUrl}</span>}
      </div>
    </div>
  );
});

export default TripCard;
