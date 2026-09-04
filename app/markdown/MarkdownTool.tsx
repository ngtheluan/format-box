"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  IconCopy,
  IconDownload,
  IconEye,
  IconFileImport,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";

const SAMPLE = `# Markdown Reader

Welcome to the FormatBox markdown reader. Everything runs client-side — nothing is uploaded.

## Features

- **Bold**, *italic*, ~~strike~~, \`code\`
- [Links](https://formatbox.dev) and images
- Lists, tables, quotes, task lists

### Code block

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

### Task list

- [x] Write markdown
- [x] Live preview
- [ ] Ship it

### Table

| Tool   | Purpose         |
| ------ | --------------- |
| Base64 | Encode / Decode |
| JSON   | Format & Graph  |
| JWT    | Decode payload  |

> Quote: readability counts.
`;

type ViewMode = "split" | "edit" | "preview";

export default function MarkdownTool() {
  const toast = useToast();
  const { t } = useI18n();
  const [text, setText] = useState<string>(SAMPLE);
  const [mode, setMode] = useState<ViewMode>("split");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    marked.setOptions({ gfm: true, breaks: true });
  }, []);

  const html = useMemo(() => {
    try {
      const raw = marked.parse(text, { async: false }) as string;
      return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
    } catch {
      return "";
    }
  }, [text]);

  const stats = useMemo(() => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split("\n").length;
    const reading = Math.max(1, Math.round(words / 200));
    return { chars, words, lines, reading };
  }, [text]);

  const loadFile = (file: File | undefined) => {
    if (!file) return;
    if (
      !/\.(md|markdown|mdx|txt)$/i.test(file.name) &&
      !file.type.startsWith("text/")
    ) {
      toast(t("toast_only_markdown"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result));
    reader.readAsText(file);
  };

  const copyHtml = () => {
    if (!html) return;
    navigator.clipboard.writeText(html).then(() => toast(t("toast_html_copied")));
  };

  const downloadHtml = () => {
    if (!html) return;
    const blob = new Blob(
      [
        `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Markdown export</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { max-width: 780px; margin: 40px auto; padding: 0 20px;
           font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
           line-height: 1.6; color: #1f2937; }
    pre { background: #0f172a; color: #f1f5f9; padding: 14px 16px;
          border-radius: 8px; overflow: auto; }
    code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; }
    blockquote { border-left: 4px solid #a78bfa; padding: 4px 14px;
                 color: #4b5563; margin: 12px 0; }
  </style>
</head>
<body>
${html}
</body>
</html>`,
      ],
      { type: "text/html" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "markdown.html";
    a.click();
    URL.revokeObjectURL(a.href);
    toast(t("toast_html_downloaded"));
  };

  const clear = () => setText("");
  const useSample = () => setText(SAMPLE);

  return (
    <div className="md-tool">
      <div className="md-toolbar">
        <div className="md-mode-tabs">
          <ModeBtn active={mode === "edit"} onClick={() => setMode("edit")}>
            <IconPencil size={14} stroke={1.9} /> {t("md_mode_edit")}
          </ModeBtn>
          <ModeBtn active={mode === "split"} onClick={() => setMode("split")}>
            {t("md_mode_split")}
          </ModeBtn>
          <ModeBtn active={mode === "preview"} onClick={() => setMode("preview")}>
            <IconEye size={14} stroke={1.9} /> {t("md_mode_preview")}
          </ModeBtn>
        </div>
        <div className="md-toolbar-actions">
          <button className="btn btn-s" onClick={() => fileRef.current?.click()}>
            <IconFileImport size={14} stroke={1.9} /> {t("act_open_file")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.mdx,.txt,text/markdown,text/plain"
            style={{ display: "none" }}
            onChange={(e) => loadFile(e.target.files?.[0])}
          />
          <button className="btn btn-s" onClick={useSample}>
            {t("act_sample")}
          </button>
          <button className="btn btn-s" onClick={copyHtml}>
            <IconCopy size={14} stroke={1.9} /> {t("md_copy_html")}
          </button>
          <button className="btn btn-s" onClick={downloadHtml}>
            <IconDownload size={14} stroke={1.9} /> {t("md_download_html")}
          </button>
          <button className="btn btn-s" onClick={clear}>
            <IconTrash size={14} stroke={1.9} /> {t("act_clear")}
          </button>
        </div>
      </div>

      <div
        className={`md-layout md-mode-${mode}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          loadFile(e.dataTransfer.files[0]);
        }}
      >
        {mode !== "preview" && (
          <div className="md-editor-col">
            <label>{t("md_editor")}</label>
            <textarea
              className="md-editor"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              placeholder={t("md_placeholder")}
            />
          </div>
        )}

        {mode !== "edit" && (
          <div className="md-preview-col">
            <label>{t("md_preview")}</label>
            <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        )}
      </div>

      <div className="info md-stats">
        <span className="info-i">{stats.chars} {t("lbl_chars")}</span>
        <span className="info-i">{stats.words} {t("lbl_words")}</span>
        <span className="info-i">{stats.lines} {t("lbl_lines")}</span>
        <span className="info-i">~{stats.reading} {t("md_reading")}</span>
      </div>
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={`md-mode-btn${active ? " active" : ""}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}
