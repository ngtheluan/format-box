"use client";
import { Button, Field, Input, Select } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { IconHeartbeat, IconRulerMeasure, IconScale } from "@tabler/icons-react";
import { useMemo, useState } from "react";

type Unit = "metric" | "imperial";
type Gender = "male" | "female";

type Band = {
  key:
    | "bmi_cat_underweight"
    | "bmi_cat_normal"
    | "bmi_cat_overweight"
    | "bmi_cat_preobese"
    | "bmi_cat_obese1"
    | "bmi_cat_obese2"
    | "bmi_cat_obese3";
  min: number;
  max: number;
  color: string;
};

// WHO standard
const WHO_BANDS: Band[] = [
  { key: "bmi_cat_underweight", min: 0, max: 18.5, color: "var(--info, #38bdf8)" },
  { key: "bmi_cat_normal", min: 18.5, max: 25, color: "var(--ok)" },
  { key: "bmi_cat_overweight", min: 25, max: 30, color: "var(--warn)" },
  { key: "bmi_cat_obese1", min: 30, max: 35, color: "#f97316" },
  { key: "bmi_cat_obese2", min: 35, max: 40, color: "#ef4444" },
  { key: "bmi_cat_obese3", min: 40, max: Infinity, color: "#b91c1c" },
];

// WPRO (Asian) standard
const WPRO_BANDS: Band[] = [
  { key: "bmi_cat_underweight", min: 0, max: 18.5, color: "var(--info, #38bdf8)" },
  { key: "bmi_cat_normal", min: 18.5, max: 23, color: "var(--ok)" },
  { key: "bmi_cat_overweight", min: 23, max: 25, color: "var(--warn)" },
  { key: "bmi_cat_obese1", min: 25, max: 30, color: "#f97316" },
  { key: "bmi_cat_obese2", min: 30, max: Infinity, color: "#ef4444" },
];

function classify(bmi: number, bands: Band[]): Band {
  return bands.find((b) => bmi >= b.min && bmi < b.max) ?? bands[bands.length - 1];
}

function toMeters(unit: Unit, cm: string, ft: string, inch: string): number {
  if (unit === "metric") return Number(cm) / 100;
  const f = Number(ft) || 0;
  const i = Number(inch) || 0;
  return (f * 12 + i) * 0.0254;
}

function toKg(unit: Unit, kg: string, lb: string): number {
  return unit === "metric" ? Number(kg) : Number(lb) * 0.45359237;
}

export default function BmiTool() {
  const { t } = useI18n();
  const [unit, setUnit] = useState<Unit>("metric");
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState("25");
  const [cm, setCm] = useState("170");
  const [kg, setKg] = useState("65");
  const [ft, setFt] = useState("5");
  const [inch, setInch] = useState("7");
  const [lb, setLb] = useState("143");

  const { bmi, meters } = useMemo(() => {
    const m = toMeters(unit, cm, ft, inch);
    const w = toKg(unit, kg, lb);
    if (!m || !w || m <= 0 || w <= 0) return { bmi: 0, meters: 0 };
    return { bmi: w / (m * m), meters: m };
  }, [unit, cm, kg, ft, inch, lb]);

  const who = useMemo(() => (bmi > 0 ? classify(bmi, WHO_BANDS) : null), [bmi]);
  const wpro = useMemo(() => (bmi > 0 ? classify(bmi, WPRO_BANDS) : null), [bmi]);

  const idealLo = meters ? 18.5 * meters * meters : 0;
  const idealHi = meters ? 22.9 * meters * meters : 0;

  const advice = (() => {
    if (!wpro) return "";
    if (wpro.key === "bmi_cat_underweight") return t("bmi_advice_underweight");
    if (wpro.key === "bmi_cat_normal") return t("bmi_advice_normal");
    if (wpro.key === "bmi_cat_overweight") return t("bmi_advice_overweight");
    return t("bmi_advice_obese");
  })();

  // Bar: 0-40 BMI scale
  const barMax = 40;
  const pct = bmi > 0 ? Math.min(100, (bmi / barMax) * 100) : 0;

  return (
    <div className="bmi-tool">
      <header className="bmi-head">
        <div className="bmi-head-ic">
          <IconHeartbeat size={22} stroke={1.75} />
        </div>
        <div>
          <h1 className="bmi-title">{t("bmi_title")}</h1>
          <p className="bmi-sub">{t("bmi_subtitle")}</p>
        </div>
      </header>

      <div className="bmi-grid">
        <section className="bmi-panel">
          <Field label={t("bmi_unit")}>
            <Select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              options={[
                { value: "metric", label: t("bmi_metric") },
                { value: "imperial", label: t("bmi_imperial") },
              ]}
            />
          </Field>

          <div className="bmi-row">
            <Field label={t("bmi_gender")}>
              <Select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                options={[
                  { value: "male", label: t("bmi_male") },
                  { value: "female", label: t("bmi_female") },
                ]}
              />
            </Field>
            <Field label={t("bmi_age")}>
              <Input
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </Field>
          </div>

          {unit === "metric" ? (
            <div className="bmi-row">
              <Field label={`${t("bmi_height")} (cm)`}>
                <Input
                  type="number"
                  min={50}
                  max={250}
                  value={cm}
                  onChange={(e) => setCm(e.target.value)}
                  leftIcon={<IconRulerMeasure size={16} stroke={1.75} />}
                />
              </Field>
              <Field label={`${t("bmi_weight")} (kg)`}>
                <Input
                  type="number"
                  min={10}
                  max={400}
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                  leftIcon={<IconScale size={16} stroke={1.75} />}
                />
              </Field>
            </div>
          ) : (
            <>
              <div className="bmi-row">
                <Field label={`${t("bmi_height")} (ft)`}>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={ft}
                    onChange={(e) => setFt(e.target.value)}
                    leftIcon={<IconRulerMeasure size={16} stroke={1.75} />}
                  />
                </Field>
                <Field label={`${t("bmi_height")} (in)`}>
                  <Input
                    type="number"
                    min={0}
                    max={11}
                    value={inch}
                    onChange={(e) => setInch(e.target.value)}
                  />
                </Field>
                <Field label={`${t("bmi_weight")} (lb)`}>
                  <Input
                    type="number"
                    min={20}
                    max={900}
                    value={lb}
                    onChange={(e) => setLb(e.target.value)}
                    leftIcon={<IconScale size={16} stroke={1.75} />}
                  />
                </Field>
              </div>
            </>
          )}

          <div className="bmi-btn-row">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCm("170");
                setKg("65");
                setFt("5");
                setInch("7");
                setLb("143");
                setAge("25");
              }}
            >
              Reset
            </Button>
          </div>
        </section>

        <section className="bmi-panel bmi-result">
          {bmi > 0 ? (
            <>
              <div className="bmi-number" style={{ color: wpro?.color }}>
                {bmi.toFixed(1)}
              </div>
              <div className="bmi-label">{t("bmi_your_bmi")}</div>

              <div className="bmi-bar">
                <div className="bmi-bar-track">
                  {WPRO_BANDS.map((b, i) => {
                    const lo = (b.min / barMax) * 100;
                    const hi = Math.min(100, (b.max === Infinity ? barMax : b.max) / barMax * 100);
                    return (
                      <span
                        key={i}
                        className="bmi-bar-seg"
                        style={{ left: `${lo}%`, width: `${hi - lo}%`, background: b.color }}
                      />
                    );
                  })}
                  <span className="bmi-bar-marker" style={{ left: `${pct}%` }} />
                </div>
                <div className="bmi-bar-scale">
                  <span>15</span>
                  <span>18.5</span>
                  <span>23</span>
                  <span>25</span>
                  <span>30</span>
                  <span>40</span>
                </div>
              </div>

              <div className="bmi-classify">
                <div className="bmi-classify-row">
                  <span className="bmi-classify-head">{t("bmi_classify_wpro")}</span>
                  <span
                    className="bmi-badge"
                    style={{ background: wpro!.color, color: "#fff" }}
                  >
                    {t(wpro!.key)}
                  </span>
                </div>
                <div className="bmi-classify-row">
                  <span className="bmi-classify-head">{t("bmi_classify_who")}</span>
                  <span
                    className="bmi-badge"
                    style={{ background: who!.color, color: "#fff" }}
                  >
                    {t(who!.key)}
                  </span>
                </div>
                <div className="bmi-classify-row">
                  <span className="bmi-classify-head">{t("bmi_ideal_range")}</span>
                  <span className="bmi-ideal">
                    {idealLo.toFixed(1)} – {idealHi.toFixed(1)} kg
                  </span>
                </div>
              </div>

              <p className="bmi-advice">{advice}</p>
            </>
          ) : (
            <p className="bmi-empty">{t("bmi_enter_values")}</p>
          )}
        </section>
      </div>

      <style jsx>{`
        .bmi-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .bmi-head {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .bmi-head-ic {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: color-mix(in oklab, var(--accent) 15%, transparent);
          color: var(--accent);
        }
        .bmi-title {
          font-size: 18px;
          margin: 0;
          font-weight: 700;
          color: var(--text);
        }
        .bmi-sub {
          margin: 2px 0 0;
          font-size: 13px;
          color: var(--muted, #6b7280);
        }
        .bmi-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 720px) {
          .bmi-grid {
            grid-template-columns: 1fr;
          }
        }
        .bmi-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg-soft, var(--bg));
        }
        .bmi-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .bmi-row > :global(*) {
          min-width: 0;
        }
        .bmi-btn-row {
          display: flex;
          justify-content: flex-end;
        }
        .bmi-result {
          align-items: stretch;
        }
        .bmi-number {
          font-size: 48px;
          font-weight: 800;
          line-height: 1;
          text-align: center;
        }
        .bmi-label {
          text-align: center;
          font-size: 13px;
          color: var(--muted, #6b7280);
          margin-top: 2px;
        }
        .bmi-bar {
          margin-top: 6px;
        }
        .bmi-bar-track {
          position: relative;
          height: 10px;
          border-radius: 999px;
          background: var(--border);
          overflow: hidden;
        }
        .bmi-bar-seg {
          position: absolute;
          top: 0;
          bottom: 0;
          opacity: 0.85;
        }
        .bmi-bar-marker {
          position: absolute;
          top: -3px;
          width: 3px;
          height: 16px;
          background: var(--text);
          transform: translateX(-50%);
          border-radius: 2px;
          box-shadow: 0 0 0 2px var(--bg);
        }
        .bmi-bar-scale {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: var(--muted, #6b7280);
          margin-top: 4px;
        }
        .bmi-classify {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }
        .bmi-classify-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--bg);
          border: 1px solid var(--border);
        }
        .bmi-classify-head {
          color: var(--muted, #6b7280);
          font-weight: 500;
        }
        .bmi-badge {
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }
        .bmi-ideal {
          font-weight: 600;
          color: var(--text);
        }
        .bmi-advice {
          margin: 4px 0 0;
          font-size: 13px;
          color: var(--text);
          padding: 10px 12px;
          border-radius: 8px;
          background: color-mix(in oklab, var(--accent) 8%, transparent);
          border-left: 3px solid var(--accent);
        }
        .bmi-empty {
          margin: auto;
          color: var(--muted, #6b7280);
          font-size: 13px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
