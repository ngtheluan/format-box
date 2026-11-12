"use client";

import { stampInk, type DykStampStyle } from "@/lib/dyk-shared";
import type { DykStamp } from "@/lib/dyk-stamps";
import { useI18n } from "@/lib/i18n";
import { IconLock, IconPhoto, IconStarFilled } from "@tabler/icons-react";
import { useId, type CSSProperties } from "react";

// Mặt tem: mọi thứ cần để in một con tem, đã chọn sẵn ngôn ngữ.
export type StampFace = {
  slug: string;
  title: string;
  // Dòng chữ nhỏ phía trên tiêu đề (nhãn riêng hoặc tag của hiện vật).
  label: string;
  image: string;
  // Số hiện vật, in ở góc như mệnh giá.
  no?: string;
  style: DykStampStyle;
  color: string;
};

export type StampEarned = { score: number; total: number; at: number };

// Tem đã lưu trước khi có cấu hình thiếu style/màu → rơi về kiểu cổ điển, màu theo slug.
export function faceFromSaved(s: DykStamp): StampFace {
  return {
    slug: s.slug,
    title: s.title,
    label: s.label ?? s.tag,
    image: s.image,
    no: s.no,
    style: s.style ?? "classic",
    color: s.color ?? "auto",
  };
}

// Dấu bưu điện đóng đè lên góc tem khi đã sưu tầm: vòng ngày tháng + sóng huỷ tem.
function Postmark({ ring, date, score }: { ring: string; date: string; score: string }) {
  const id = `st-arc-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg className="st-mark" viewBox="0 0 200 120" aria-hidden="true">
      <defs>
        <path id={id} d="M 96 60 a 44 44 0 1 1 88 0" />
      </defs>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        {[36, 50, 64, 78].map((y) => (
          <path key={y} strokeWidth="1.8" d={`M 4 ${y} q 9 -7 18 0 t 18 0 t 18 0 t 18 0 t 12 0`} />
        ))}
        <circle cx="140" cy="60" r="56" strokeWidth="2.4" />
        <circle cx="140" cy="60" r="34" strokeWidth="1.4" />
        <path strokeWidth="1.4" strokeDasharray="1 5" d="M 104 80 a 44 44 0 0 0 72 0" />
      </g>
      <g fill="currentColor" fontWeight="700" textAnchor="middle">
        <text fontSize="9" letterSpacing="1.5">
          <textPath href={`#${id}`} startOffset="50%">
            {ring}
          </textPath>
        </text>
        <text x="140" y="58" fontSize="12.5">
          {date}
        </text>
        <text x="140" y="74" fontSize="11.5">
          {score}
        </text>
      </g>
    </svg>
  );
}

// Con tem bưu chính: viền răng cưa, khung in, tranh, mệnh giá. Kích thước tính theo
// bước răng `--p` nên răng luôn khớp bốn cạnh ở mọi cỡ.
export function Stamp({
  face,
  size = "md",
  earned,
  locked,
  pop,
  className,
}: {
  face: StampFace;
  size?: "sm" | "md" | "lg";
  earned?: StampEarned | null;
  locked?: boolean;
  // Hiệu ứng "đóng dấu" khi vừa nhận tem.
  pop?: boolean;
  className?: string;
}) {
  const { t, lang } = useI18n();
  const perfect = !!earned && earned.total > 0 && earned.score >= earned.total;
  const date = earned
    ? new Date(earned.at).toLocaleDateString(lang === "en" ? "en-GB" : "vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "";
  const state = locked ? t("blog_dyk_stamp_locked") : earned ? `${earned.score}/${earned.total}` : "";
  const cls = [
    "st",
    `st--${face.style}`,
    `st--${size}`,
    locked && "is-locked",
    earned && "is-earned",
    perfect && "is-perfect",
    pop && "is-pop",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <figure
      className={cls}
      style={{ "--st-ink": stampInk(face.color, face.slug) } as CSSProperties}
      aria-label={[t("blog_dyk_stamp"), face.title, state].filter(Boolean).join(" · ")}
    >
      <span className="st-sheet">
        <span className="st-face">
          <span className="st-top">
            <span className="st-brand">{t("blog_dyk_title")}</span>
            {face.no && <span className="st-no">№ {face.no}</span>}
          </span>
          <span className="st-art">
            <span className="st-pic">
              {face.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={face.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
              ) : (
                <IconPhoto size={22} stroke={1.4} />
              )}
            </span>
          </span>
          <span className="st-foot">
            {face.label && <span className="st-label">{face.label}</span>}
            <span className="st-title">{face.title}</span>
          </span>
        </span>
      </span>
      {locked && (
        <span className="st-lock" aria-hidden="true">
          <IconLock size={16} stroke={2} />
        </span>
      )}
      {earned && !locked && (
        <Postmark ring={t("blog_dyk_owned").toUpperCase()} date={date} score={`${earned.score}/${earned.total}`} />
      )}
      {perfect && !locked && (
        <span className="st-seal" title={t("blog_dyk_stamp_perfect")}>
          <IconStarFilled size={12} />
        </span>
      )}
    </figure>
  );
}
