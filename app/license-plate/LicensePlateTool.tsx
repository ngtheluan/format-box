"use client";
import { useMemo, useState } from "react";
import { IconSearch, IconMapPin, IconX, IconInfoCircle } from "@tabler/icons-react";
import { useI18n } from "@/lib/i18n";
import {
  PLATES,
  REGION_LABEL,
  REGION_COLOR,
  type PlateEntry,
  type Region,
  stripDiacritics,
  extractCode,
  parsePlate,
  KIND_LABEL,
  PLATE_COLOR_HEX,
} from "./data";

const CSS = `
.lp-wrap { display: grid; gap: 14px; }

.lp-search { position: relative; }
.lp-search input {
  width: 100%; padding: 11px 36px 11px 38px;
  border-radius: 10px; border: 1px solid var(--line, #e5e7eb);
  background: var(--surface, #fff); color: inherit; font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.lp-search input:focus { outline: 2px solid var(--accent, #6366f1); outline-offset: -1px; }
.lp-ic-l, .lp-ic-r {
  position: absolute; top: 50%; transform: translateY(-50%);
  display: inline-flex; opacity: .55;
}
.lp-ic-l { left: 12px; pointer-events: none; }
.lp-ic-r {
  right: 10px; background: transparent; border: 0; cursor: pointer; padding: 4px; border-radius: 6px;
}
.lp-ic-r:hover { background: var(--surface-2, rgba(0,0,0,.04)); opacity: 1; }

.lp-hit {
  display: flex; align-items: center; gap: 12px;
  padding: 14px; border-radius: 12px;
  border: 1px solid var(--line, #e5e7eb);
  background: linear-gradient(135deg, rgba(99,102,241,.08), rgba(99,102,241,.02));
}
.lp-badge {
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 20px; letter-spacing: .04em;
  min-width: 68px; padding: 10px 14px;
  background: #fde68a; color: #111;
  border: 2px solid #111; border-radius: 8px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  white-space: nowrap;
}
.lp-badge-sep { opacity: .35; margin: 0 2px; font-weight: 400; }
.lp-parts { display: flex; flex-wrap: wrap; gap: 10px 16px; margin-top: 6px; font-size: 12px; }
.lp-part-k { opacity: .55; margin-right: 4px; text-transform: uppercase; letter-spacing: .05em; font-size: 10.5px; font-weight: 600; }
.lp-part-v { font-weight: 600; font-family: ui-monospace, Menlo, Consolas, monospace; }
.lp-note {
  display: flex; align-items: flex-start; gap: 8px;
  margin-top: 10px; padding: 9px 11px; border-radius: 8px;
  background: rgba(251, 191, 36, .1);
  border-left: 3px solid #f59e0b;
  font-size: 11.5px; line-height: 1.5; color: inherit;
}
.lp-note-ic { flex-shrink: 0; color: #f59e0b; margin-top: 1px; }
.lp-note-body b { font-weight: 600; }
.lp-hit-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.lp-hit-prov { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
.lp-hit-meta { font-size: 12px; opacity: .65; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.lp-hit-codes { font-size: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; opacity: .75; }

.lp-filters {
  display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
  font-size: 12px;
}
.lp-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: 999px;
  border: 1px solid var(--line, #e5e7eb); background: transparent;
  cursor: pointer; font-size: 12px; color: inherit;
  transition: background .15s, border-color .15s;
}
.lp-chip:hover { background: var(--surface-2, rgba(0,0,0,.04)); }
.lp-chip-dot { width: 8px; height: 8px; border-radius: 50%; }
.lp-chip-on,
.lp-chip-on:hover { background: var(--text, #111); color: var(--bg, #fff); border-color: var(--text, #111); }
.lp-chip-on .lp-chip-dot { outline: 2px solid var(--bg, #fff); outline-offset: 1px; }

.lp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 8px;
}
.lp-card {
  display: flex; flex-direction: column; gap: 6px;
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid var(--line, #e5e7eb);
  background: var(--surface, #fff);
  text-align: left; cursor: pointer; color: inherit;
  transition: transform .12s, border-color .12s, background .12s;
}
.lp-card:hover { transform: translateY(-1px); border-color: var(--accent, #6366f1); }
.lp-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.lp-card-codes {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-weight: 700; font-size: 13px; letter-spacing: .02em;
  display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap;
}
.lp-card-code {
  padding: 2px 6px; border-radius: 5px;
  background: #fde68a; color: #111;
  border: 1px solid rgba(0,0,0,.15); font-size: 12px;
}
.lp-card-prov { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }
.lp-card-reg { font-size: 11px; opacity: .55; display: flex; align-items: center; gap: 5px; }

.lp-empty { text-align: center; padding: 24px; opacity: .6; font-size: 13px; }
.lp-count { font-size: 12px; opacity: .55; }
`;

function formatSerial(s: string): string {
  // 5 số: 123.45 ; 4 số: 1234
  if (s.length === 5) return `${s.slice(0, 3)}.${s.slice(3)}`;
  if (s.length === 4) return `${s.slice(0, 2)}.${s.slice(2)}`;
  return s;
}

export default function LicensePlateTool() {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<Region | "all">("all");

  const parsed = useMemo(() => parsePlate(q), [q]);
  const hit: PlateEntry | null = useMemo(() => {
    const code = parsed?.code ?? extractCode(q);
    if (!code) return null;
    return PLATES.find((p) => p.codes.includes(code)) ?? null;
  }, [q, parsed]);

  const filtered = useMemo(() => {
    const nq = stripDiacritics(q);
    // Nếu user gõ đúng dạng biển (hoặc mã), chỉ cần parse ra mã tỉnh là coi như match tỉnh đó.
    const parsedCode = parsed?.code ?? null;
    return PLATES.filter((p) => {
      if (region !== "all" && p.region !== region) return false;
      if (!nq) return true;
      if (parsedCode && p.codes.includes(parsedCode)) return true;
      if (p.codes.some((c) => c.toLowerCase().includes(nq))) return true;
      if (stripDiacritics(p.province).includes(nq)) return true;
      if (p.aliases?.some((a) => stripDiacritics(a).includes(nq))) return true;
      return false;
    });
  }, [q, region, parsed]);

  const regions: (Region | "all")[] = ["all", "bac", "trung", "tnguyen", "nam", "special"];

  return (
    <div className="lp-wrap">
      <style>{CSS}</style>

      <div className="lp-search">
        <IconSearch size={16} stroke={1.8} className="lp-ic-l" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("lp_search_ph")}
          autoFocus
        />
        {q && (
          <button type="button" className="lp-ic-r" onClick={() => setQ("")} aria-label="Clear">
            <IconX size={14} stroke={2} />
          </button>
        )}
      </div>

      {hit && (
        <div className="lp-hit">
          <div
            className="lp-badge"
            style={
              parsed
                ? {
                    background: PLATE_COLOR_HEX[parsed.plateColor].bg,
                    color: PLATE_COLOR_HEX[parsed.plateColor].text,
                  }
                : undefined
            }
          >
            {parsed ? (
              <>
                {parsed.code}
                {parsed.series && (
                  <>
                    <span className="lp-badge-sep">·</span>
                    {parsed.series}
                  </>
                )}
                {parsed.serial && (
                  <>
                    <span className="lp-badge-sep">-</span>
                    {formatSerial(parsed.serial)}
                  </>
                )}
              </>
            ) : (
              extractCode(q)
            )}
          </div>
          <div className="lp-hit-body">
            <div className="lp-hit-prov">{hit.province}</div>
            <div className="lp-hit-meta">
              <span className="lp-chip-dot" style={{ background: REGION_COLOR[hit.region] }} />
              {REGION_LABEL[hit.region][lang]}
              <span style={{ opacity: 0.4 }}>·</span>
              <span className="lp-hit-codes">{hit.codes.join(", ")}</span>
            </div>
            {parsed && (parsed.series || parsed.serial || parsed.kind !== "unknown") && (
              <div className="lp-parts">
                <div>
                  <span className="lp-part-k">{t("lp_prov_code")}</span>
                  <span className="lp-part-v">{parsed.code}</span>
                </div>
                {parsed.series && (
                  <div>
                    <span className="lp-part-k">{t("lp_series")}</span>
                    <span className="lp-part-v">{parsed.series}</span>
                  </div>
                )}
                {parsed.serial && (
                  <div>
                    <span className="lp-part-k">{t("lp_serial")}</span>
                    <span className="lp-part-v">{formatSerial(parsed.serial)}</span>
                  </div>
                )}
                {parsed.kind !== "unknown" && (
                  <div>
                    <span className="lp-part-k">{t("lp_kind")}</span>
                    <span className="lp-part-v" style={{ fontFamily: "inherit" }}>
                      {KIND_LABEL[parsed.kind][lang]}
                    </span>
                  </div>
                )}
              </div>
            )}
            {parsed && (parsed.series || parsed.serial) && (
              <div className="lp-note">
                <IconInfoCircle size={14} stroke={2} className="lp-note-ic" />
                <div className="lp-note-body">{t("lp_note_district")}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="lp-filters">
        {regions.map((r) => {
          const on = region === r;
          return (
            <button
              key={r}
              type="button"
              className={`lp-chip ${on ? "lp-chip-on" : ""}`}
              onClick={() => setRegion(r)}
            >
              {r !== "all" && (
                <span className="lp-chip-dot" style={{ background: REGION_COLOR[r] }} />
              )}
              {r === "all" ? t("lp_all") : REGION_LABEL[r][lang]}
            </button>
          );
        })}
        <span className="lp-count" style={{ marginLeft: "auto" }}>
          {filtered.length} / {PLATES.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="lp-empty">{t("lp_empty")}</div>
      ) : (
        <div className="lp-grid">
          {filtered.map((p) => {
            const isHit = hit && hit.codes[0] === p.codes[0];
            return (
              <button
                key={p.codes[0]}
                type="button"
                className={`lp-card ${isHit ? "lp-card-match" : ""}`}
                onClick={() => setQ(p.codes[0])}
              >
                <div className="lp-card-top">
                  <span className="lp-card-codes">
                    {p.codes.map((c) => (
                      <span key={c} className="lp-card-code">{c}</span>
                    ))}
                  </span>
                </div>
                <div className="lp-card-prov">{p.province}</div>
                <div className="lp-card-reg">
                  <IconMapPin size={11} stroke={2} />
                  <span className="lp-chip-dot" style={{ background: REGION_COLOR[p.region] }} />
                  {REGION_LABEL[p.region][lang]}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
