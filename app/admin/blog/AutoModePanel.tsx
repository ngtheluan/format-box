"use client";
import type { SelectOption } from "@/components/ui";
import { Field, Input, Select } from "@/components/ui";
import {
  IconAdjustmentsHorizontal,
  IconInfinity,
  IconLoader2,
  IconPencil,
  IconRotateClockwise,
  IconSparkles,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

export type AutoRunSettings = {
  unlimited: boolean;
  count: number;
  gapMinutes: number;
};

type Props = {
  onClose: () => void;
  onEditConfig: () => void;
  running: boolean;
  categoryLabel: string;
  inherited: { label: string; value: string }[];
  onStart: (settings: AutoRunSettings) => Promise<boolean>;
};

const STORAGE_KEY = "bga-auto-run";
const MAX_COUNT = 200;
const COUNT_CHOICES = [5, 10, 20, 50];
const GAP_OPTIONS: SelectOption[] = [
  { value: "0", label: "Liền mạch" },
  { value: "15", label: "15 phút" },
  { value: "30", label: "30 phút" },
  { value: "60", label: "1 giờ" },
  { value: "180", label: "3 giờ" },
  { value: "360", label: "6 giờ" },
  { value: "720", label: "12 giờ" },
];

function loadSaved(): Partial<AutoRunSettings> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Partial<AutoRunSettings>;
  } catch {
    return {};
  }
}

// Auto mode of the "Sinh bài blog" popup: renders that popup's body and footer.
// Content settings come from the Config mode; only the run itself is chosen here.
export default function AutoModePanel({ onClose, onEditConfig, running, categoryLabel, inherited, onStart }: Props) {
  const [saved] = useState(loadSaved);
  const [count, setCount] = useState(saved.count ?? 10);
  const [unlimited, setUnlimited] = useState(saved.unlimited ?? false);
  const [gapMinutes, setGapMinutes] = useState(saved.gapMinutes ?? 0);
  const [starting, setStarting] = useState(false);

  // Saved on every change: switching popup mode unmounts this panel.
  useEffect(() => {
    try {
      const next: AutoRunSettings = { count, unlimited, gapMinutes };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, [count, unlimited, gapMinutes]);

  async function start() {
    setStarting(true);
    // The parent closes the popup on success, which unmounts this panel.
    const ok = await onStart({ unlimited, count, gapMinutes });
    if (!ok) setStarting(false);
  }

  const summary = running
    ? "Chế độ Tự động đang chạy. Dừng job hiện tại để bắt đầu job mới."
    : [
        unlimited ? "Sinh liên tục" : `${count} bài`,
        `chủ đề ngẫu nhiên trong ${categoryLabel}`,
        gapMinutes ? `cách ${GAP_OPTIONS.find((g) => g.value === String(gapMinutes))?.label}` : "liền mạch",
      ].join(" · ");

  return (
    <>
      <div className="fx-modal-body">
        <div className="bga-auto">
          <p className="bga-auto-note">
            <IconRotateClockwise size={13} stroke={2} />
            Chạy nền trên server, đóng tab vẫn tiếp tục. Mỗi bài tự chọn chủ đề ngẫu nhiên trong danh mục; nếu model bị
            giới hạn sẽ tự đổi sang model khác. Bài được lưu vào Nháp để bạn duyệt.
          </p>
          <div className="bga-auto-grid">
            <section className="bga-auto-sec">
              <h3>
                <IconRotateClockwise size={14} stroke={2} /> Lượt chạy
              </h3>
              <Field label="Số lượng bài">
                <div className="bga-auto-count">
                  <div className="bga-seg">
                    {COUNT_CHOICES.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={!unlimited && count === n ? "is-on" : ""}
                        onClick={() => {
                          setUnlimited(false);
                          setCount(n);
                        }}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={unlimited ? "is-on" : ""}
                      aria-label="Sinh liên tục"
                      title="Sinh liên tục đến khi bạn dừng"
                      onClick={() => setUnlimited(true)}
                    >
                      <IconInfinity size={15} stroke={2} />
                    </button>
                  </div>
                  <Input
                    type="number"
                    inputSize="sm"
                    min={1}
                    max={MAX_COUNT}
                    disabled={unlimited}
                    value={unlimited ? "" : count}
                    aria-label="Số bài tuỳ chỉnh"
                    onChange={(e) => setCount(Math.max(1, Math.min(MAX_COUNT, Number(e.target.value) || 1)))}
                  />
                </div>
              </Field>
              <Field label="Giãn cách giữa các bài">
                <Select
                  selectSize="sm"
                  value={String(gapMinutes)}
                  options={GAP_OPTIONS}
                  onChange={(e) => setGapMinutes(Number(e.target.value))}
                />
              </Field>
            </section>

            <section className="bga-auto-sec">
              <h3>
                <IconAdjustmentsHorizontal size={14} stroke={2} /> Theo mode Cấu hình
                <button type="button" className="bga-auto-edit" onClick={onEditConfig}>
                  <IconPencil size={12} stroke={2} /> Sửa
                </button>
              </h3>
              <dl className="bga-auto-inherit">
                {inherited.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </div>
      <div className="fx-modal-foot">
        <span className="bga-auto-summary">{summary}</span>
        <button type="button" className="fx-btn" onClick={onClose}>
          Đóng
        </button>
        <button type="button" className="fx-btn fx-btn-primary" disabled={starting || running} onClick={start}>
          {starting ? <IconLoader2 size={14} className="bga-spin" /> : <IconSparkles size={14} />}
          Sinh bài
        </button>
      </div>
    </>
  );
}
