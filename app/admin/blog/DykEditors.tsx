"use client";

import { Stamp, type StampFace } from "@/app/blog/DykStamp";
import { Button, Field, IconButton, Input, Select, Switch, Textarea } from "@/components/ui";
import type { DidYouKnowImage, DidYouKnowQuizQuestion } from "@/lib/blog";
import {
  QUIZ_COUNT_MAX,
  QUIZ_COUNT_MIN,
  QUIZ_SCOPES,
  STAMP_COLORS,
  STAMP_PASSES,
  STAMP_STYLES,
  clampQuizCount,
  stampNeeded,
  type DykConfig,
  type DykQuizScope,
  type DykStampDesign,
  type DykStampPass,
  type DykStampStyle,
} from "@/lib/dyk-shared";
import {
  IconChevronDown,
  IconCircleCheck,
  IconCircleCheckFilled,
  IconDeviceFloppy,
  IconPlus,
  IconSettings,
  IconSparkles,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";

const SCOPE_OPTIONS = QUIZ_SCOPES.map((s) => ({ value: s.value, label: s.label }));
const STYLE_OPTIONS = STAMP_STYLES.map((s) => ({ value: s.value, label: s.label }));
const PASS_OPTIONS = STAMP_PASSES.map((s) => ({ value: s.value, label: s.label }));
const COLOR_OPTIONS = [
  { value: "auto", label: "Tự động theo hiện vật" },
  ...STAMP_COLORS.map((c) => ({ value: c.value, label: c.label })),
];

const SAMPLE_FACE = {
  slug: "mau-tem",
  title: "Cực quang không chỉ có màu xanh",
  label: "Thiên nhiên",
  image: "",
  no: "001",
};

// ---------------------------------------------------------------------------
// Cấu hình chung: áp dụng khi AI sinh quiz và cho hiện vật chưa có tem riêng.
// ---------------------------------------------------------------------------
export function DykConfigModal({
  config,
  onClose,
  onSaved,
}: {
  config: DykConfig;
  onClose: () => void;
  onSaved: (next: DykConfig) => void;
}) {
  const [draft, setDraft] = useState<DykConfig>(config);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (patch: Partial<DykConfig>) => setDraft((d) => ({ ...d, ...patch }));

  async function save() {
    setSaving(true);
    setErr("");
    try {
      const r = await fetch("/api/blog/did-you-know/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: draft }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error || `Lỗi ${r.status}`);
        return;
      }
      onSaved(j.config ?? draft);
    } catch (e: any) {
      setErr(e?.message || "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  const scopeHint = QUIZ_SCOPES.find((s) => s.value === draft.quiz_scope)?.hint;

  return (
    <div className="fx-modal-bg" style={{ zIndex: 200 }}>
      <div className="fx-modal" style={{ maxWidth: 760, width: "96vw" }}>
        <div className="fx-modal-head">
          <h2>
            <IconSettings size={16} stroke={2} /> Cấu hình câu hỏi &amp; tem
          </h2>
          <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={() => !saving && onClose()}>
            <IconX size={16} stroke={2} />
          </button>
        </div>
        <div className="fx-modal-body">
          <div className="dyk-cfg">
            <div className="dyk-cfg-form">
              <div className="dyk-cfg-title">Câu hỏi do AI sinh</div>
              <div className="bga-grid2">
                <Field label="Số câu mỗi hiện vật" hint={`${QUIZ_COUNT_MIN}–${QUIZ_COUNT_MAX} câu`}>
                  <Input
                    type="number"
                    min={QUIZ_COUNT_MIN}
                    max={QUIZ_COUNT_MAX}
                    value={draft.quiz_count}
                    disabled={saving}
                    onChange={(e) => set({ quiz_count: clampQuizCount(e.target.value, draft.quiz_count) })}
                  />
                </Field>
                <Field label="Phạm vi câu hỏi" hint={scopeHint}>
                  <Select
                    options={SCOPE_OPTIONS}
                    value={draft.quiz_scope}
                    disabled={saving}
                    onChange={(e) => set({ quiz_scope: e.target.value as DykQuizScope })}
                  />
                </Field>
              </div>
              <Switch
                checked={draft.quiz_verify}
                disabled={saving}
                onChange={(e) => set({ quiz_verify: e.target.checked })}
                label="Kiểm chứng dữ kiện trước khi lưu"
                description="Chạy thêm một lượt AI (có tra cứu web nếu model hỗ trợ) và loại câu sai hoặc không chắc chắn. Chậm hơn khoảng 20–40 giây."
              />

              <div className="dyk-cfg-title">Tem mặc định</div>
              <div className="bga-grid2">
                <Field label="Mẫu tem">
                  <Select
                    options={STYLE_OPTIONS}
                    value={draft.stamp_style}
                    disabled={saving}
                    onChange={(e) => set({ stamp_style: e.target.value as DykStampStyle })}
                  />
                </Field>
                <Field label="Màu mực">
                  <Select
                    options={COLOR_OPTIONS}
                    value={draft.stamp_color}
                    disabled={saving}
                    onChange={(e) => set({ stamp_color: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Điều kiện nhận tem" hint="Áp dụng cho hiện vật chưa đặt tem riêng.">
                <Select
                  options={PASS_OPTIONS}
                  value={draft.stamp_pass}
                  disabled={saving}
                  onChange={(e) => set({ stamp_pass: e.target.value as DykStampPass })}
                />
              </Field>
            </div>
            <div className="dyk-cfg-preview">
              <Stamp
                face={{ ...SAMPLE_FACE, style: draft.stamp_style, color: draft.stamp_color }}
                size="sm"
                earned={{ score: 3, total: 3, at: Date.now() }}
              />
              <span>Xem trước</span>
            </div>
          </div>
          {err && <div className="fx-err">{err}</div>}
        </div>
        <div className="fx-modal-foot">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button leftIcon={<IconDeviceFloppy size={14} />} loading={saving} onClick={save}>
            Lưu cấu hình
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Soạn câu hỏi của một hiện vật: sửa tay từng câu hoặc để AI sinh lại cả bộ.
// ---------------------------------------------------------------------------
export type DykQuizGenOptions = { count: number; scope: DykQuizScope; verify: boolean };

const BLANK_QUESTION: DidYouKnowQuizQuestion = {
  q_vi: "",
  q_en: "",
  options_vi: ["", "", "", ""],
  options_en: ["", "", "", ""],
  answer: 0,
  explain_vi: "",
  explain_en: "",
  scope: "exhibit",
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

// Câu thiếu nội dung sẽ bị API bỏ qua khi lưu — báo trước để admin không mất công.
export function quizIssue(q: DidYouKnowQuizQuestion): string {
  if (!q.q_vi.trim()) return "Thiếu câu hỏi (VI)";
  if (q.options_vi.some((o) => !o.trim())) return "Thiếu lựa chọn (VI)";
  return "";
}

export function DykQuizEditor({
  quiz,
  onChange,
  disabled,
  defaults,
  canGenerate,
  onGenerate,
}: {
  quiz: DidYouKnowQuizQuestion[];
  onChange: (next: DidYouKnowQuizQuestion[]) => void;
  disabled?: boolean;
  defaults: DykConfig;
  canGenerate: boolean;
  // Trả về ghi chú kết quả (đã kiểm chứng, loại mấy câu…) hoặc ném lỗi.
  onGenerate: (opts: DykQuizGenOptions) => Promise<string>;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [count, setCount] = useState(defaults.quiz_count);
  const [scope, setScope] = useState<DykQuizScope>(defaults.quiz_scope);
  const [verify, setVerify] = useState(defaults.quiz_verify);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const locked = disabled || busy;

  const patch = (i: number, p: Partial<DidYouKnowQuizQuestion>) =>
    onChange(quiz.map((q, k) => (k === i ? { ...q, ...p } : q)));
  const setOption = (i: number, key: "options_vi" | "options_en", k: number, value: string) =>
    patch(i, { [key]: quiz[i][key].map((o, n) => (n === k ? value : o)) });

  async function generate() {
    if (quiz.length && !confirm(`Thay ${quiz.length} câu hiện có bằng bộ câu hỏi mới do AI sinh?`)) return;
    setBusy(true);
    setErr("");
    setNote("");
    try {
      setNote(await onGenerate({ count, scope, verify }));
      setOpen(null);
    } catch (e: any) {
      setErr(e?.message || "AI lỗi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dyk-quiz-ed">
      {canGenerate && (
        <div className="dyk-quiz-gen">
          <Field label="Số câu">
            <Input
              type="number"
              min={QUIZ_COUNT_MIN}
              max={QUIZ_COUNT_MAX}
              value={count}
              disabled={locked}
              onChange={(e) => setCount(clampQuizCount(e.target.value, count))}
            />
          </Field>
          <Field label="Phạm vi">
            <Select
              options={SCOPE_OPTIONS}
              value={scope}
              disabled={locked}
              onChange={(e) => setScope(e.target.value as DykQuizScope)}
            />
          </Field>
          <Switch
            checked={verify}
            disabled={locked}
            onChange={(e) => setVerify(e.target.checked)}
            label="Kiểm chứng"
          />
          <Button leftIcon={<IconSparkles size={14} stroke={2.2} />} loading={busy} disabled={disabled} onClick={generate}>
            {busy ? "Đang sinh…" : "Sinh bằng AI"}
          </Button>
        </div>
      )}
      {note && <div className="dyk-quiz-note">{note}</div>}
      {err && <div className="fx-err">{err}</div>}

      {quiz.length === 0 ? (
        <div className="dyk-quiz-empty">Chưa có câu hỏi — hiện vật này sẽ không có phòng thử thách và không phát tem.</div>
      ) : (
        <ol className="dyk-quiz-list">
          {quiz.map((q, i) => {
            const issue = quizIssue(q);
            const isOpen = open === i;
            return (
              <li key={i} className={`dyk-q${isOpen ? " is-open" : ""}`}>
                <div className="dyk-q-head">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="dyk-q-toggle"
                    aria-expanded={isOpen}
                    rightIcon={<IconChevronDown size={14} stroke={2} />}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <b>{i + 1}.</b>
                    <span>{q.q_vi || "(câu hỏi trống)"}</span>
                  </Button>
                  {issue ? (
                    <span className="fx-badge" data-tone="warn">
                      {issue}
                    </span>
                  ) : (
                    <span className="fx-badge" data-tone="mute">
                      {q.scope === "topic" ? "Mở rộng" : "Trong hiện vật"}
                    </span>
                  )}
                  <IconButton
                    size="sm"
                    variant="danger"
                    aria-label={`Xoá câu ${i + 1}`}
                    disabled={locked}
                    onClick={() => {
                      onChange(quiz.filter((_, k) => k !== i));
                      setOpen(null);
                    }}
                  >
                    <IconTrash size={14} stroke={1.9} />
                  </IconButton>
                </div>

                {isOpen && (
                  <div className="dyk-q-body">
                    <div className="bga-grid2">
                      <Field label="Câu hỏi (VI)" required>
                        <Textarea
                          rows={2}
                          value={q.q_vi}
                          disabled={locked}
                          onChange={(e) => patch(i, { q_vi: e.target.value })}
                        />
                      </Field>
                      <Field label="Câu hỏi (EN)">
                        <Textarea
                          rows={2}
                          value={q.q_en}
                          disabled={locked}
                          onChange={(e) => patch(i, { q_en: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field label="Lựa chọn — bấm dấu tích để chọn đáp án đúng">
                      <div className="dyk-q-opts">
                        {q.options_vi.map((_, k) => (
                          <div key={k} className="dyk-q-opt">
                            <IconButton
                              size="sm"
                              variant={q.answer === k ? "primary" : "ghost"}
                              aria-label={`Đáp án ${LETTERS[k]} là đáp án đúng`}
                              aria-pressed={q.answer === k}
                              disabled={locked}
                              onClick={() => patch(i, { answer: k })}
                            >
                              {q.answer === k ? (
                                <IconCircleCheckFilled size={16} />
                              ) : (
                                <IconCircleCheck size={16} stroke={1.8} />
                              )}
                            </IconButton>
                            <Input
                              value={q.options_vi[k]}
                              disabled={locked}
                              placeholder={`${LETTERS[k]} (VI)`}
                              onChange={(e) => setOption(i, "options_vi", k, e.target.value)}
                            />
                            <Input
                              value={q.options_en[k] ?? ""}
                              disabled={locked}
                              placeholder={`${LETTERS[k]} (EN)`}
                              onChange={(e) => setOption(i, "options_en", k, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </Field>
                    <div className="bga-grid2">
                      <Field label="Lời giải (VI)">
                        <Textarea
                          rows={2}
                          value={q.explain_vi}
                          disabled={locked}
                          onChange={(e) => patch(i, { explain_vi: e.target.value })}
                        />
                      </Field>
                      <Field label="Lời giải (EN)">
                        <Textarea
                          rows={2}
                          value={q.explain_en}
                          disabled={locked}
                          onChange={(e) => patch(i, { explain_en: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field label="Nguồn kiến thức" hint="Hiện thành nhãn nhỏ phía trên câu hỏi.">
                      <Select
                        options={[
                          { value: "exhibit", label: "Trong hiện vật" },
                          { value: "topic", label: "Kiến thức mở rộng" },
                        ]}
                        value={q.scope ?? "exhibit"}
                        disabled={locked}
                        onChange={(e) => patch(i, { scope: e.target.value as "exhibit" | "topic" })}
                      />
                    </Field>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <Button
        variant="ghost"
        size="sm"
        leftIcon={<IconPlus size={13} stroke={2} />}
        disabled={locked || quiz.length >= QUIZ_COUNT_MAX}
        onClick={() => {
          onChange([...quiz, { ...BLANK_QUESTION, options_vi: ["", "", "", ""], options_en: ["", "", "", ""] }]);
          setOpen(quiz.length);
        }}
      >
        Thêm câu hỏi ({quiz.length}/{QUIZ_COUNT_MAX})
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tem của một hiện vật: theo mặc định chung, hoặc thiết kế riêng.
// ---------------------------------------------------------------------------
export function DykStampEditor({
  stamp,
  custom,
  fallback,
  onChange,
  onCustomChange,
  disabled,
  images,
  face,
  quizCount,
}: {
  stamp: DykStampDesign;
  custom: boolean;
  // Thiết kế mặc định chung — hiển thị khi không bật tem riêng.
  fallback: DykStampDesign;
  onChange: (next: DykStampDesign) => void;
  onCustomChange: (custom: boolean) => void;
  disabled?: boolean;
  images: DidYouKnowImage[];
  face: Pick<StampFace, "slug" | "title" | "label" | "no">;
  quizCount: number;
}) {
  const shown = custom ? stamp : fallback;
  const set = (patch: Partial<DykStampDesign>) => onChange({ ...stamp, ...patch });
  const locked = disabled || !custom;
  const picture = shown.image || images[0]?.url || "";
  const need = stampNeeded(shown.pass, quizCount);

  return (
    <div className="dyk-cfg">
      <div className="dyk-cfg-form">
        <Switch
          checked={custom}
          disabled={disabled}
          onChange={(e) => onCustomChange(e.target.checked)}
          label="Thiết kế tem riêng cho hiện vật này"
          description="Tắt → dùng mẫu, màu và điều kiện nhận tem trong Cấu hình chung."
        />
        <div className="bga-grid2">
          <Field label="Mẫu tem">
            <Select
              options={STYLE_OPTIONS}
              value={shown.style}
              disabled={locked}
              onChange={(e) => set({ style: e.target.value as DykStampStyle })}
            />
          </Field>
          <Field label="Màu mực">
            <Select
              options={COLOR_OPTIONS}
              value={shown.color}
              disabled={locked}
              onChange={(e) => set({ color: e.target.value })}
            />
          </Field>
        </div>
        <div className="bga-grid2">
          <Field label="Dòng chữ trên tem (VI)" hint="Trống → dùng tag của hiện vật.">
            <Input
              value={shown.label_vi}
              maxLength={40}
              disabled={locked}
              placeholder={face.label}
              onChange={(e) => set({ label_vi: e.target.value })}
            />
          </Field>
          <Field label="Dòng chữ trên tem (EN)">
            <Input
              value={shown.label_en}
              maxLength={40}
              disabled={locked}
              onChange={(e) => set({ label_en: e.target.value })}
            />
          </Field>
        </div>
        <Field
          label="Điều kiện nhận tem"
          hint={quizCount ? `Với ${quizCount} câu hiện có: cần đúng ${need}/${quizCount}.` : "Hiện vật chưa có câu hỏi nên chưa phát tem."}
        >
          <Select
            options={PASS_OPTIONS}
            value={shown.pass}
            disabled={locked}
            onChange={(e) => set({ pass: e.target.value as DykStampPass })}
          />
        </Field>
        <Field label="Ảnh in trên tem" hint="Chọn một ảnh của hiện vật, hoặc dán URL ảnh khác.">
          <div className="dyk-stamp-pics">
            {images
              .filter((im) => im.url)
              .map((im, i) => {
                const on = shown.image ? shown.image === im.url : i === 0;
                return (
                  <Button
                    key={`${im.url}-${i}`}
                    variant="ghost"
                    className={`dyk-stamp-pic${on ? " is-on" : ""}`}
                    aria-label={`Dùng ảnh ${i + 1}`}
                    aria-pressed={on}
                    disabled={locked}
                    onClick={() => set({ image: i === 0 ? "" : im.url })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  </Button>
                );
              })}
          </div>
          <Input
            value={shown.image}
            disabled={locked}
            placeholder="https://… (trống → ảnh đầu tiên)"
            onChange={(e) => set({ image: e.target.value.trim() })}
          />
        </Field>
      </div>
      <div className="dyk-cfg-preview">
        <Stamp
          face={{
            ...face,
            label: shown.label_vi || face.label,
            image: picture,
            style: shown.style,
            color: shown.color,
          }}
          size="md"
          earned={{ score: quizCount || 3, total: quizCount || 3, at: Date.now() }}
        />
        <span>Tem khi đạt điểm tối đa</span>
        <Stamp
          face={{
            ...face,
            label: shown.label_vi || face.label,
            image: picture,
            style: shown.style,
            color: shown.color,
          }}
          size="sm"
          locked
        />
        <span>Khi chưa sưu tầm</span>
      </div>
    </div>
  );
}
