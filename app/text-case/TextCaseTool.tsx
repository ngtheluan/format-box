"use client";
import { useMemo, useState } from "react";
import { IconCopy, IconTrash, IconArrowsExchange } from "@tabler/icons-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { caseList, cases } from "@/lib/textCase";
import { Button, Textarea } from "@/components/ui";

export default function TextCaseTool() {
  const toast = useToast();
  const { t } = useI18n();
  const [text, setText] = useState("Hello Format Box — chuyển đổi CHỮ dễ dàng.");

  const results = useMemo(
    () =>
      caseList.map((c) => ({
        ...c,
        value: cases[c.key](text),
      })),
    [text]
  );

  const copy = (value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => toast(t("toast_copied")));
  };

  const stats = useMemo(() => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split("\n").length;
    return { chars, words, lines };
  }, [text]);

  return (
    <div className="tc-tool">
      <div className="tc-input-wrap">
        <label>{t("tc_input_label")}</label>
        <Textarea
          className="tc-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("tc_input_placeholder")}
          spellCheck={false}
        />
        <div className="actions">
          <Button size="sm" variant="subtle" onClick={() => setText("")} leftIcon={<IconTrash size={14} stroke={1.9} />}>
            {t("act_clear")}
          </Button>
          <Button
            size="sm"
            variant="subtle"
            onClick={() => setText(text.toLowerCase())}
            leftIcon={<IconArrowsExchange size={14} stroke={1.9} />}
          >
            {t("tc_reset_lower")}
          </Button>
        </div>
        <div className="info tc-stats">
          <span className="info-i">{stats.chars} {t("lbl_chars")}</span>
          <span className="info-i">{stats.words} {t("lbl_words")}</span>
          <span className="info-i">{stats.lines} {t("lbl_lines")}</span>
        </div>
      </div>

      <div className="tc-grid">
        {results.map((r) => (
          <button
            key={r.key}
            className="tc-card"
            onClick={() => copy(r.value)}
            type="button"
            title={t("tc_click_copy")}
          >
            <div className="tc-card-head">
              <div className="tc-card-name">
                <b>{r.title}</b>
                <span>{r.sub}</span>
              </div>
              <IconCopy size={14} stroke={1.9} className="tc-card-copy" />
            </div>
            <div className="tc-card-value">{r.value || <em>—</em>}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
