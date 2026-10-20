"use client";
import { useToast } from "@/components/Toast";
import { Button, DatePickerInput, IconButton, Input, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconCalendarEvent,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconEye,
  IconLink,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import * as htmlToImage from "html-to-image";
import { useCallback, useEffect, useRef, useState } from "react";
import TripCard from "./TripCard";
import {
  ACCENT_PRESETS,
  countStops,
  emptyDay,
  emptyStop,
  emptyTrip,
  encodeTrip,
  normalizeTrip,
  STOP_CATEGORIES,
  proxiedImage,
  type Day,
  type Stop,
  type StopCategory,
  type Trip,
} from "./shared";

const LS_KEY = "fb-travel-plan";

type PickTarget = { type: "cover" } | { type: "stop"; dayId: string; stopId: string };

export default function TravelPlanTool() {
  const { t } = useI18n();
  const toast = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  const [trip, setTrip] = useState<Trip>(emptyTrip);
  const [loaded, setLoaded] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "view">("edit");
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [picker, setPicker] = useState<PickTarget | null>(null);

  // Restore / persist the draft locally so a refresh never loses work.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = normalizeTrip(JSON.parse(saved));
        if (parsed) setTrip(parsed);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(trip));
    } catch {
      /* ignore */
    }
    setShareUrl(""); // any edit invalidates a previously generated link
  }, [trip, loaded]);

  // --- mutations ---
  const patchTrip = (patch: Partial<Trip>) => setTrip((tr) => ({ ...tr, ...patch }));

  const patchDay = (dayId: string, patch: Partial<Day>) =>
    setTrip((tr) => ({ ...tr, days: tr.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)) }));

  const patchStop = (dayId: string, stopId: string, patch: Partial<Stop>) =>
    setTrip((tr) => ({
      ...tr,
      days: tr.days.map((d) =>
        d.id === dayId ? { ...d, stops: d.stops.map((s) => (s.id === stopId ? { ...s, ...patch } : s)) } : d,
      ),
    }));

  const addDay = () => setTrip((tr) => ({ ...tr, days: [...tr.days, emptyDay()] }));
  const removeDay = (dayId: string) =>
    setTrip((tr) => ({ ...tr, days: tr.days.length > 1 ? tr.days.filter((d) => d.id !== dayId) : tr.days }));
  const moveDay = (dayId: string, dir: -1 | 1) =>
    setTrip((tr) => {
      const i = tr.days.findIndex((d) => d.id === dayId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= tr.days.length) return tr;
      const days = [...tr.days];
      [days[i], days[j]] = [days[j], days[i]];
      return { ...tr, days };
    });

  const addStop = (dayId: string) =>
    setTrip((tr) => ({
      ...tr,
      days: tr.days.map((d) => (d.id === dayId ? { ...d, stops: [...d.stops, emptyStop()] } : d)),
    }));
  const removeStop = (dayId: string, stopId: string) =>
    setTrip((tr) => ({
      ...tr,
      days: tr.days.map((d) => (d.id === dayId ? { ...d, stops: d.stops.filter((s) => s.id !== stopId) } : d)),
    }));
  const moveStop = (dayId: string, stopId: string, dir: -1 | 1) =>
    setTrip((tr) => ({
      ...tr,
      days: tr.days.map((d) => {
        if (d.id !== dayId) return d;
        const i = d.stops.findIndex((s) => s.id === stopId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= d.stops.length) return d;
        const stops = [...d.stops];
        [stops[i], stops[j]] = [stops[j], stops[i]];
        return { ...d, stops };
      }),
    }));

  // --- image picker ---
  const applyPickedImage = (url: string) => {
    if (!picker) return;
    if (picker.type === "cover") patchTrip({ cover: url });
    else patchStop(picker.dayId, picker.stopId, { image: url });
    setPicker(null);
  };

  // --- export ---
  const download = useCallback(async () => {
    if (!previewRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await htmlToImage.toPng(previewRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      const slug = (trip.title || "lo-trinh").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      a.download = `${slug || "lo-trinh"}.png`;
      a.click();
      toast(t("trip_toast_downloaded"));
    } catch {
      toast(t("trip_toast_export_failed"));
    } finally {
      setBusy(false);
    }
  }, [trip.title, t, toast]);

  // --- share ---
  const makeShareLink = async () => {
    if (!trip.title.trim() && countStops(trip) === 0) {
      toast(t("trip_toast_need_content"));
      return;
    }
    const payload = encodeTrip(trip);
    const url = `${window.location.origin}/travel-plan/view#${payload}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      toast(t("trip_toast_link_copied"));
    } catch {
      toast(t("trip_link_ready"));
    }
  };

  const resetTrip = () => {
    if (window.confirm(t("trip_reset_confirm"))) {
      setTrip(emptyTrip());
      setShareUrl("");
    }
  };

  const catOptions = STOP_CATEGORIES.map((c) => ({
    value: c,
    label: t(`trip_cat_${c}` as Parameters<typeof t>[0]),
  }));

  return (
    <div className="trip-tool">
      {/* toolbar */}
      <div className="trip-toolbar">
        <div className="trip-seg">
          <button className={mobileView === "edit" ? "is-active" : ""} onClick={() => setMobileView("edit")}>
            <IconPencil size={16} stroke={1.8} />
            {t("trip_tab_edit")}
          </button>
          <button className={mobileView === "view" ? "is-active" : ""} onClick={() => setMobileView("view")}>
            <IconEye size={16} stroke={1.8} />
            {t("trip_tab_preview")}
          </button>
        </div>
        <div className="trip-toolbar-actions">
          <Button variant="subtle" size="sm" leftIcon={<IconRefresh size={16} />} onClick={resetTrip}>
            {t("trip_reset")}
          </Button>
          <Button variant="subtle" size="sm" leftIcon={<IconLink size={16} />} onClick={makeShareLink}>
            {t("trip_share")}
          </Button>
          <Button size="sm" loading={busy} leftIcon={<IconDownload size={16} />} onClick={download}>
            {t("trip_download")}
          </Button>
        </div>
      </div>

      {shareUrl && (
        <div className="trip-share-bar">
          <IconLink size={16} stroke={1.8} />
          <Input className="trip-share-input" inputSize="sm" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
          <IconButton
            aria-label={t("trip_copy_link")}
            size="sm"
            variant="subtle"
            onClick={() => {
              navigator.clipboard.writeText(shareUrl).then(() => toast(t("trip_toast_link_copied")));
            }}
          >
            <IconCopy size={16} />
          </IconButton>
          <IconButton aria-label={t("trip_open_link")} size="sm" variant="subtle" onClick={() => window.open(shareUrl, "_blank")}>
            <IconExternalLink size={16} />
          </IconButton>
        </div>
      )}

      <div className={`trip-layout view-${mobileView}`}>
        {/* ---------- EDITOR ---------- */}
        <div className="trip-editor">
          {/* Setup */}
          <section className="trip-section">
            <h3 className="trip-section-title">{t("trip_setup")}</h3>
            <div className="trip-grid2">
              <label className="trip-f">
                <span>{t("trip_name")}</span>
                <Input
                  value={trip.title}
                  placeholder={t("trip_name_ph")}
                  onChange={(e) => patchTrip({ title: e.target.value })}
                />
              </label>
              <label className="trip-f">
                <span>{t("trip_dest")}</span>
                <Input
                  value={trip.subtitle ?? ""}
                  placeholder={t("trip_dest_ph")}
                  onChange={(e) => patchTrip({ subtitle: e.target.value })}
                />
              </label>
              <label className="trip-f">
                <span>{t("trip_start")}</span>
                <DatePickerInput value={trip.startDate ?? ""} onValueChange={(v) => patchTrip({ startDate: v })} clearable />
              </label>
              <label className="trip-f">
                <span>{t("trip_end")}</span>
                <DatePickerInput value={trip.endDate ?? ""} onValueChange={(v) => patchTrip({ endDate: v })} clearable />
              </label>
            </div>

            {/* Accent / tông màu */}
            <div className="trip-f" style={{ marginTop: 12 }}>
              <span>{t("trip_accent")}</span>
              <div className="trip-swatches">
                {ACCENT_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    className={`trip-swatch ${trip.accent === p.color ? "is-active" : ""}`}
                    style={{ background: p.color }}
                    title={t(`trip_tone_${p.key}` as Parameters<typeof t>[0])}
                    aria-label={t(`trip_tone_${p.key}` as Parameters<typeof t>[0])}
                    onClick={() => patchTrip({ accent: p.color })}
                  />
                ))}
                <label className="trip-swatch trip-swatch-custom" title={t("trip_accent_custom")}>
                  <input type="color" value={trip.accent} onChange={(e) => patchTrip({ accent: e.target.value })} />
                </label>
              </div>
            </div>

            {/* Cover */}
            <div className="trip-f" style={{ marginTop: 12 }}>
              <span>{t("trip_cover")}</span>
              <div className="trip-cover-row">
                {trip.cover ? (
                  <div className="trip-cover-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={proxiedImage(trip.cover)} alt="" />
                    <button onClick={() => patchTrip({ cover: "" })} aria-label={t("trip_remove_image")}>
                      <IconX size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="trip-cover-empty">
                    <IconPhoto size={20} stroke={1.5} />
                  </div>
                )}
                <div className="trip-cover-controls">
                  <Button
                    variant="subtle"
                    size="sm"
                    leftIcon={<IconSearch size={15} />}
                    onClick={() => setPicker({ type: "cover" })}
                  >
                    {t("trip_search_image")}
                  </Button>
                  <Input
                    inputSize="sm"
                    value={trip.cover ?? ""}
                    placeholder={t("trip_custom_url_ph")}
                    onChange={(e) => patchTrip({ cover: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Days */}
          <section className="trip-section">
            <h3 className="trip-section-title">{t("trip_itinerary")}</h3>
            {trip.days.map((day, di) => (
              <div className="trip-day-edit" key={day.id}>
                <div className="trip-day-edit-head">
                  <span className="trip-day-badge">
                    {t("trip_day")} {di + 1}
                  </span>
                  <DatePickerInput
                    inputSize="sm"
                    value={day.date ?? ""}
                    onValueChange={(v) => patchDay(day.id, { date: v })}
                    clearable
                    leftIcon={<IconCalendarEvent size={15} />}
                  />
                  <Input
                    inputSize="sm"
                    value={day.title ?? ""}
                    placeholder={t("trip_day_title_ph")}
                    onChange={(e) => patchDay(day.id, { title: e.target.value })}
                  />
                  <div className="trip-day-edit-ctrls">
                    <IconButton aria-label={t("trip_move_up")} size="sm" variant="subtle" disabled={di === 0} onClick={() => moveDay(day.id, -1)}>
                      <IconChevronUp size={16} />
                    </IconButton>
                    <IconButton
                      aria-label={t("trip_move_down")}
                      size="sm"
                      variant="subtle"
                      disabled={di === trip.days.length - 1}
                      onClick={() => moveDay(day.id, 1)}
                    >
                      <IconChevronDown size={16} />
                    </IconButton>
                    <IconButton
                      aria-label={t("trip_remove_day")}
                      size="sm"
                      variant="danger"
                      disabled={trip.days.length <= 1}
                      onClick={() => removeDay(day.id)}
                    >
                      <IconTrash size={16} />
                    </IconButton>
                  </div>
                </div>

                <div className="trip-stops-edit">
                  {day.stops.map((stop, si) => (
                    <div className="trip-stop-edit" key={stop.id}>
                      <div className="trip-stop-edit-top">
                        <Input
                          inputSize="sm"
                          className="trip-stop-time"
                          value={stop.time ?? ""}
                          placeholder="09:00"
                          leftIcon={<IconClock size={14} />}
                          onChange={(e) => patchStop(day.id, stop.id, { time: e.target.value })}
                        />
                        <Input
                          inputSize="sm"
                          className="trip-stop-name-in"
                          value={stop.name}
                          placeholder={t("trip_stop_name_ph")}
                          onChange={(e) => patchStop(day.id, stop.id, { name: e.target.value })}
                        />
                        <Select
                          selectSize="sm"
                          className="trip-stop-cat"
                          options={catOptions}
                          value={stop.category ?? "sight"}
                          onChange={(e) => patchStop(day.id, stop.id, { category: e.target.value as StopCategory })}
                        />
                        <div className="trip-stop-edit-ctrls">
                          <IconButton aria-label={t("trip_move_up")} size="sm" variant="subtle" disabled={si === 0} onClick={() => moveStop(day.id, stop.id, -1)}>
                            <IconChevronUp size={15} />
                          </IconButton>
                          <IconButton
                            aria-label={t("trip_move_down")}
                            size="sm"
                            variant="subtle"
                            disabled={si === day.stops.length - 1}
                            onClick={() => moveStop(day.id, stop.id, 1)}
                          >
                            <IconChevronDown size={15} />
                          </IconButton>
                          <IconButton aria-label={t("trip_remove_stop")} size="sm" variant="danger" onClick={() => removeStop(day.id, stop.id)}>
                            <IconX size={15} />
                          </IconButton>
                        </div>
                      </div>
                      <div className="trip-stop-edit-bottom">
                        {stop.image ? (
                          <div className="trip-stop-thumb">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={proxiedImage(stop.image)} alt="" />
                            <button onClick={() => patchStop(day.id, stop.id, { image: "" })} aria-label={t("trip_remove_image")}>
                              <IconX size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="trip-stop-addimg"
                            onClick={() => setPicker({ type: "stop", dayId: day.id, stopId: stop.id })}
                            title={t("trip_search_image")}
                          >
                            <IconPhoto size={18} stroke={1.5} />
                          </button>
                        )}
                        <Textarea
                          className="trip-stop-note"
                          value={stop.note ?? ""}
                          placeholder={t("trip_note_ph")}
                          rows={1}
                          autoGrow
                          onChange={(e) => patchStop(day.id, stop.id, { note: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" leftIcon={<IconPlus size={15} />} onClick={() => addStop(day.id)} block>
                    {t("trip_add_stop")}
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="subtle" leftIcon={<IconPlus size={16} />} onClick={addDay} block>
              {t("trip_add_day")}
            </Button>
          </section>
        </div>

        {/* ---------- PREVIEW ---------- */}
        <div className="trip-preview-pane">
          <div className="trip-preview-scroll">
            <TripCard ref={previewRef} trip={trip} />
          </div>
        </div>
      </div>

      <ImagePicker
        open={!!picker}
        initialQuery={pickerInitialQuery(trip, picker)}
        onClose={() => setPicker(null)}
        onPick={applyPickedImage}
      />
    </div>
  );
}

function pickerInitialQuery(trip: Trip, picker: PickTarget | null): string {
  if (!picker) return "";
  if (picker.type === "cover") return trip.subtitle || trip.title || "";
  const day = trip.days.find((d) => d.id === picker.dayId);
  const stop = day?.stops.find((s) => s.id === picker.stopId);
  return stop?.name || trip.subtitle || "";
}

// ------------------------------------------------------------------
// Image picker modal — searches /api/place-photo and renders a grid.
// ------------------------------------------------------------------
type PhotoResult = { id: string; url: string; thumb: string; title: string; source: string; license?: string };

function ImagePicker({
  open,
  initialQuery,
  onClose,
  onPick,
}: {
  open: boolean;
  initialQuery: string;
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PhotoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (open) {
      setQ(initialQuery);
      setResults([]);
      setSearched(false);
    }
  }, [open, initialQuery]);

  const run = useCallback(async (query: string) => {
    const term = query.trim();
    if (!term) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/place-photo?q=${encodeURIComponent(term)}`);
      const j = (await res.json()) as { results?: PhotoResult[] };
      setResults(j.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search once when opened with a prefilled query.
  useEffect(() => {
    if (open && initialQuery.trim()) run(initialQuery);
  }, [open, initialQuery, run]);

  return (
    <Modal open={open} onClose={onClose} title={t("trip_pick_image")} size="lg">
      <form
        className="trip-pick-search"
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
      >
        <Input
          value={q}
          autoFocus
          placeholder={t("trip_search_ph")}
          leftIcon={<IconSearch size={16} />}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" loading={loading}>
          {t("trip_search")}
        </Button>
      </form>

      <div className="trip-pick-grid">
        {loading && (
          <div className="trip-pick-state">
            <Spinner />
          </div>
        )}
        {!loading && searched && results.length === 0 && <div className="trip-pick-state">{t("trip_no_images")}</div>}
        {!loading &&
          results.map((r) => (
            <button key={r.id} className="trip-pick-item" onClick={() => onPick(r.url)} title={r.title}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.thumb} alt={r.title} loading="lazy" referrerPolicy="no-referrer" />
            </button>
          ))}
      </div>

      <div className="trip-pick-foot">
        <span>{t("trip_pick_credit")}</span>
        <div className="trip-pick-url">
          <Input
            inputSize="sm"
            placeholder={t("trip_custom_url_ph")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) onPick(v);
              }
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
