"use client";
import { useI18n } from "@/lib/i18n";
import { IconFileSpreadsheet, IconFiles, IconPhoto } from "@tabler/icons-react";
import { useState } from "react";
import ExcelMergeTool from "./ExcelMergeTool";
import ImageToWordTool from "./ImageToWordTool";

type Mode = "pick" | "excel" | "image";

export default function FormatFileTool() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("pick");

  if (mode === "excel") return <ExcelMergeTool onBack={() => setMode("pick")} />;
  if (mode === "image") return <ImageToWordTool onBack={() => setMode("pick")} />;

  return (
    <div className="pk-upload-wrap">
      <div className="pk-upload-hero">
        <div className="pk-hero-badge">
          <IconFiles size={14} />
          <span>Format File</span>
        </div>
        <h1>{t("ff_pick_title")}</h1>
        <p>{t("ff_pick_subtitle")}</p>
      </div>

      <div className="pk-upload-grid">
        <div
          className="pk-card"
          onClick={() => setMode("excel")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMode("excel");
            }
          }}
        >
          <div className="pk-card-icon">
            <IconFileSpreadsheet size={36} stroke={1.5} />
          </div>
          <div className="pk-card-title">{t("ff_pick_excel")}</div>
          <div className="pk-card-desc">{t("ff_pick_excel_desc")}</div>
          <div className="pk-card-tags">
            <span>.xlsx</span>
            <span>.xls</span>
            <span>.csv</span>
            <span>.ods</span>
          </div>
        </div>

        <div
          className="pk-card pk-card-alt"
          onClick={() => setMode("image")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMode("image");
            }
          }}
        >
          <div className="pk-card-icon pk-card-icon-alt">
            <IconPhoto size={36} stroke={1.5} />
          </div>
          <div className="pk-card-title">{t("ff_pick_image")}</div>
          <div className="pk-card-desc">{t("ff_pick_image_desc")}</div>
          <div className="pk-card-tags">
            <span>.jpg</span>
            <span>.png</span>
            <span>.webp</span>
            <span>→ .doc</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pk-upload-wrap {
          padding: 20px;
          border-radius: 16px;
          background:
            radial-gradient(1200px 300px at 10% -10%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 60%),
            radial-gradient(900px 260px at 110% -20%, color-mix(in oklab, var(--ok) 10%, transparent), transparent 60%),
            var(--bg-elev, var(--bg));
          border: 1px solid var(--border);
        }
        .pk-upload-hero {
          text-align: center;
          padding: 10px 0 22px;
        }
        .pk-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          color: var(--accent);
          background: color-mix(in oklab, var(--accent) 10%, transparent);
          border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
        }
        .pk-upload-hero h1 {
          margin: 12px 0 6px;
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
        }
        .pk-upload-hero p {
          margin: 0 auto;
          max-width: 540px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.55;
        }

        .pk-upload-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 860px) {
          .pk-upload-grid { grid-template-columns: 1fr; }
        }

        .pk-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 36px 20px;
          text-align: center;
          cursor: pointer;
          border: 2px dashed var(--border);
          border-radius: 14px;
          background: var(--bg);
          transition: all .15s ease;
          min-height: 260px;
          outline: none;
        }
        .pk-card:hover,
        .pk-card:focus-visible {
          border-color: var(--accent);
          background: color-mix(in oklab, var(--accent) 6%, var(--bg));
          transform: translateY(-1px);
        }
        .pk-card-alt:hover,
        .pk-card-alt:focus-visible {
          border-color: var(--accent2, var(--accent));
          background: color-mix(in oklab, var(--accent2, var(--accent)) 6%, var(--bg));
        }

        .pk-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in oklab, var(--accent) 12%, var(--bg));
          color: var(--accent);
          margin-bottom: 4px;
        }
        .pk-card-icon-alt {
          background: color-mix(in oklab, var(--accent2, var(--accent)) 12%, var(--bg));
          color: var(--accent2, var(--accent));
        }

        .pk-card-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
        }
        .pk-card-desc {
          font-size: 12.5px;
          color: var(--muted);
          line-height: 1.55;
          max-width: 320px;
        }
        .pk-card-tags {
          display: inline-flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px;
          margin-top: 6px;
        }
        .pk-card-tags span {
          font-size: 10.5px;
          font-family: var(--mono);
          padding: 3px 8px;
          border-radius: 999px;
          background: var(--bg-elev, color-mix(in oklab, var(--accent) 6%, var(--bg)));
          border: 1px solid var(--border);
          color: var(--muted);
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
