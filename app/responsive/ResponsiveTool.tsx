"use client";
import { useToast } from "@/components/Toast";
import { DEVICES, type Device } from "@/lib/devices";
import { useI18n } from "@/lib/i18n";
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconExternalLink,
  IconReload,
  IconRotate,
  IconWorld,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProto);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const CategoryIcon = ({ cat }: { cat: Device["category"] }) => {
  if (cat === "mobile") return <IconDeviceMobile size={14} stroke={1.9} />;
  if (cat === "tablet") return <IconDeviceTablet size={14} stroke={1.9} />;
  return <IconDeviceDesktop size={14} stroke={1.9} />;
};

export default function ResponsiveTool() {
  const toast = useToast();
  const { t } = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const [urlInput, setUrlInput] = useState("https://format-box.vercel.app");
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>(DEVICES[1]); // iPhone 14 default
  const [landscape, setLandscape] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [autoFit, setAutoFit] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const w = landscape ? device.height : device.width;
  const h = landscape ? device.width : device.height;

  // Auto-fit zoom based on shell (with bezel) natural size vs stage size
  useEffect(() => {
    if (!autoFit) return;
    const stage = stageRef.current;
    const shell = shellRef.current;
    if (!stage || !shell) return;
    const compute = () => {
      const availW = stage.clientWidth - 40;
      const availH = stage.clientHeight - 60;
      // offsetWidth/Height ignore CSS transform → we get the natural pre-scale size
      const naturalW = shell.offsetWidth;
      const naturalH = shell.offsetHeight;
      if (!naturalW || !naturalH) return;
      const s = Math.min(availW / naturalW, availH / naturalH, 1);
      setZoom(Math.max(0.1, +s.toFixed(2)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [autoFit, w, h, device.category, landscape]);

  const grouped = useMemo(() => {
    const g: Record<Device["category"], Device[]> = { mobile: [], tablet: [], desktop: [] };
    for (const d of DEVICES) g[d.category].push(d);
    return g;
  }, []);

  const go = () => {
    const url = normalizeUrl(urlInput);
    if (!url) {
      toast(t("rt_invalid_url"));
      return;
    }
    setLoadedUrl(url);
    setReloadKey((k) => k + 1);
  };

  const reload = () => {
    if (!loadedUrl) return;
    setReloadKey((k) => k + 1);
  };

  const openNew = () => {
    if (!loadedUrl) return;
    window.open(loadedUrl, "_blank", "noopener");
  };

  const catLabel: Record<Device["category"], string> = {
    mobile: t("rt_category_mobile"),
    tablet: t("rt_category_tablet"),
    desktop: t("rt_category_desktop"),
  };

  return (
    <div className="rt-layout">
      <aside className="rt-side">
        <label className="rt-label">{t("rt_url_label")}</label>
        <div className="rt-url-row">
          <IconWorld size={16} stroke={1.8} />
          <input
            className="rt-url-input"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={t("rt_url_ph")}
            onKeyDown={(e) => e.key === "Enter" && go()}
            spellCheck={false}
          />
          <button className="btn btn-p btn-tiny" onClick={go}>
            {t("rt_go")}
          </button>
        </div>

        {(["mobile", "tablet", "desktop"] as const).map((cat) => (
          <div className="rt-group" key={cat}>
            <div className="rt-group-head">
              <CategoryIcon cat={cat} />
              <span>{catLabel[cat]}</span>
            </div>
            <div className="rt-devices">
              {grouped[cat].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`rt-device${device.id === d.id ? " on" : ""}`}
                  onClick={() => setDevice(d)}
                >
                  <b>{d.name}</b>
                  <span>
                    {d.width}×{d.height}
                    {d.dpr ? ` · @${d.dpr}x` : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <div className="rt-main">
        <div className="rt-toolbar">
          <div className="rt-toolbar-left">
            <span className="rt-current">
              <CategoryIcon cat={device.category} />
              <b>{device.name}</b>
              <span>
                {w}×{h}
              </span>
            </span>
          </div>
          <div className="rt-toolbar-right">
            <button className="btn btn-s" onClick={() => setLandscape((v) => !v)} title={t("rt_rotate")}>
              <IconRotate size={14} stroke={1.9} /> {t("rt_rotate")}
            </button>
            <div className="rt-zoom">
              <span>{t("rt_zoom")}</span>
              <select
                value={autoFit ? "auto" : String(zoom)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "auto") {
                    setAutoFit(true);
                  } else {
                    setAutoFit(false);
                    setZoom(Number(v));
                  }
                }}
              >
                <option value="auto">{t("rt_fit")}</option>
                <option value="1">100%</option>
                <option value="0.75">75%</option>
                <option value="0.5">50%</option>
                <option value="0.33">33%</option>
                <option value="0.25">25%</option>
              </select>
            </div>
            <button className="btn btn-s" onClick={reload} disabled={!loadedUrl}>
              <IconReload size={14} stroke={1.9} /> {t("rt_reload")}
            </button>
            <button className="btn btn-s" onClick={openNew} disabled={!loadedUrl}>
              <IconExternalLink size={14} stroke={1.9} /> {t("rt_open_new")}
            </button>
          </div>
        </div>

        <div className="rt-stage" ref={stageRef}>
          {loadedUrl ? (
            <div
              ref={shellRef}
              className={`rt-shell rt-shell-${device.category}${landscape ? " rt-shell-ls" : ""}`}
              style={{ transform: `scale(${zoom})` }}
            >
              <div className="rt-screen" style={{ width: w, height: h }}>
                <iframe
                  ref={iframeRef}
                  key={reloadKey}
                  src={loadedUrl}
                  title="Preview"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          ) : (
            <div className="rt-empty">
              <IconWorld size={30} stroke={1.4} />
              <span>{t("rt_empty")}</span>
            </div>
          )}
        </div>

        <p className="rt-warn">{t("rt_iframe_warn")}</p>
      </div>
    </div>
  );
}
