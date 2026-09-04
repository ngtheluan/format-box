"use client";
import { useRef, useState } from "react";
import {
  IconArrowsUpDown,
  IconTrash,
  IconPaperclip,
  IconCopy,
  IconDownload,
} from "@tabler/icons-react";
import { useToast } from "@/components/Toast";

type Mode = "encode" | "decode";
type State = "idle" | "ok" | "err";

export default function Base64Tool() {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [state, setState] = useState<State>("idle");
  const [info, setInfo] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputLabel = mode === "encode" ? "Nhập text cần encode" : "Nhập Base64 cần decode";
  const inputPlaceholder = mode === "encode" ? "Paste text vào đây..." : "Paste Base64 vào đây...";
  const convertLabel = mode === "encode" ? "Encode →" : "Decode →";

  const setTab = (m: Mode) => {
    setMode(m);
    setState("idle");
  };

  const convert = () => {
    if (!input.trim()) {
      toast("Chưa có dữ liệu");
      return;
    }
    try {
      if (mode === "encode") {
        const encoded = btoa(unescape(encodeURIComponent(input)));
        setOutput(encoded);
        setInfo([`Input: ${new Blob([input]).size} bytes`, `Output: ${encoded.length} chars`]);
      } else {
        const decoded = decodeURIComponent(escape(atob(input.trim())));
        setOutput(decoded);
        setInfo([`Input: ${input.trim().length} chars`, `Output: ${new Blob([decoded]).size} bytes`]);
      }
      setState("ok");
    } catch {
      setOutput("");
      setState("err");
      setInfo([`Invalid ${mode === "decode" ? "Base64" : "input"}`]);
      toast("Lỗi: dữ liệu không hợp lệ");
    }
  };

  const swap = () => {
    setInput(output);
    setOutput("");
    setState("idle");
    setMode(mode === "encode" ? "decode" : "encode");
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setInfo([]);
    setState("idle");
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => toast("Đã copy"));
  };

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = mode === "encode" ? "encoded.txt" : "decoded.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    if (mode === "encode") {
      reader.onload = () => {
        const base64 = String(reader.result).split(",")[1] ?? "";
        setInput(`[file: ${file.name}]`);
        setOutput(base64);
        setState("ok");
        setInfo([file.name, `${(file.size / 1024).toFixed(1)} KB → ${base64.length} chars`]);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => setInput(String(reader.result));
      reader.readAsText(file);
    }
  };

  return (
    <div className="tool-card">
      <div className="toolbar">
        <div className="tabs">
          <button className={`tab${mode === "encode" ? " active" : ""}`} onClick={() => setTab("encode")}>
            Encode
          </button>
          <button className={`tab${mode === "decode" ? " active" : ""}`} onClick={() => setTab("decode")}>
            Decode
          </button>
        </div>
        <div className="toolbar-actions">
          <button className="icon-btn" onClick={swap} title="Đổi chiều">
            <IconArrowsUpDown size={18} stroke={1.8} />
          </button>
          <button className="icon-btn" onClick={clear} title="Xóa">
            <IconTrash size={18} stroke={1.8} />
          </button>
        </div>
      </div>

      <div className="cols">
        <div className="col">
          <label>{inputLabel}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputPlaceholder}
          />
          <div
            className={`drop-zone${dragging ? " drag" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files[0]);
            }}
          >
            <span className="drop-inline">
              <IconPaperclip size={16} stroke={1.7} /> Kéo thả file vào đây hoặc <u>chọn file</u>
            </span>
            <input
              ref={fileRef}
              type="file"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        </div>
        <div className="col">
          <label>Kết quả</label>
          <textarea
            className={`output-area${state === "ok" ? " state-ok" : state === "err" ? " state-err" : ""}`}
            readOnly
            value={output}
            placeholder="Kết quả sẽ hiện ở đây..."
          />
          <div className="actions">
            <button className="btn btn-s" onClick={copy}>
              <IconCopy size={15} stroke={1.8} /> Copy
            </button>
            <button className="btn btn-s" onClick={download}>
              <IconDownload size={15} stroke={1.8} /> Tải file
            </button>
          </div>
        </div>
      </div>

      <div className="convert-row">
        <button className="btn btn-p btn-lg" onClick={convert}>{convertLabel}</button>
      </div>

      <div className="info">
        {info.map((i) => (
          <span key={i} className="info-item" style={state === "err" ? { color: "var(--err)" } : undefined}>
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}
