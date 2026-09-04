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
      toast("Chỉ hỗ trợ file text/markdown");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result));
    reader.readAsText(file);
  };

  const copyHtml = () => {
    if (!html) return;
    navigator.clipboard.writeText(html).then(() => toast("Đã copy HTML"));
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
    toast("Đã tải HTML");
  };

  const clear = () => setText("");
  const useSample = () => setText(SAMPLE);

  return (
    <div className="md-tool">
      <div className="md-toolbar">
        <div className="md-mode-tabs">
          <ModeBtn active={mode === "edit"} onClick={() => setMode("edit")}>
            <IconPencil size={14} stroke={1.9} /> Edit
          </ModeBtn>
          <ModeBtn active={mode === "split"} onClick={() => setMode("split")}>
            Split
          </ModeBtn>
          <ModeBtn active={mode === "preview"} onClick={() => setMode("preview")}>
            <IconEye size={14} stroke={1.9} /> Preview
          </ModeBtn>
        </div>
        <div className="md-toolbar-actions">
          <button className="btn btn-s" onClick={() => fileRef.current?.click()}>
            <IconFileImport size={14} stroke={1.9} /> Mở file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.mdx,.txt,text/markdown,text/plain"
            style={{ display: "none" }}
            onChange={(e) => loadFile(e.target.files?.[0])}
          />
          <button className="btn btn-s" onClick={useSample}>
            Mẫu
          </button>
          <button className="btn btn-s" onClick={copyHtml}>
            <IconCopy size={14} stroke={1.9} /> Copy HTML
          </button>
          <button className="btn btn-s" onClick={downloadHtml}>
            <IconDownload size={14} stroke={1.9} /> Tải HTML
          </button>
          <button className="btn btn-s" onClick={clear}>
            <IconTrash size={14} stroke={1.9} /> Xoá
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
            <label>Markdown</label>
            <textarea
              className="md-editor"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              placeholder="Paste hoặc kéo thả file .md vào đây..."
            />
          </div>
        )}

        {mode !== "edit" && (
          <div className="md-preview-col">
            <label>Preview</label>
            <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        )}
      </div>

      <div className="info md-stats">
        <span className="info-i">{stats.chars} chars</span>
        <span className="info-i">{stats.words} words</span>
        <span className="info-i">{stats.lines} lines</span>
        <span className="info-i">~{stats.reading} phút đọc</span>
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
