"use client";
import { useMemo, useState } from "react";
import { IconCopy, IconTrash, IconArrowsExchange } from "@tabler/icons-react";
import { useToast } from "@/components/Toast";
import { caseList, cases } from "@/lib/textCase";

export default function TextCaseTool() {
  const toast = useToast();
  const [text, setText] = useState("Hello Format Box — chuyển đổi CHỮ dễ dàng.");

  const results = useMemo(
    () =>
      caseList.map((c) => ({
        ...c,
        value: cases[c.key](text),
      })),
    [text]
  );

  const copy = (value: string, name: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => toast(`Đã copy ${name}`));
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
        <label>Nhập text</label>
        <textarea
          className="tc-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste text vào đây..."
          spellCheck={false}
        />
        <div className="actions">
          <button className="btn btn-s" onClick={() => setText("")}>
            <IconTrash size={14} stroke={1.9} /> Xoá
          </button>
          <button className="btn btn-s" onClick={() => setText(text.toLowerCase())}>
            <IconArrowsExchange size={14} stroke={1.9} /> Về gốc lower
          </button>
        </div>
        <div className="info tc-stats">
          <span className="info-i">{stats.chars} chars</span>
          <span className="info-i">{stats.words} words</span>
          <span className="info-i">{stats.lines} lines</span>
        </div>
      </div>

      <div className="tc-grid">
        {results.map((r) => (
          <button
            key={r.key}
            className="tc-card"
            onClick={() => copy(r.value, r.title)}
            type="button"
            title="Click để copy"
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
