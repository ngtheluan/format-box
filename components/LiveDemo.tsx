"use client";
import { useEffect, useState } from "react";

type Mode = "encode" | "decode";

function convert(mode: Mode, value: string): string {
  if (!value.trim()) return "";
  try {
    if (mode === "encode") return btoa(unescape(encodeURIComponent(value)));
    return decodeURIComponent(escape(atob(value.trim())));
  } catch {
    return "⚠ input không hợp lệ";
  }
}

export default function LiveDemo() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("Hello FormatBox 👋");
  const [output, setOutput] = useState("");

  useEffect(() => {
    setOutput(convert(mode, input));
  }, [mode, input]);

  const swap = () => {
    const nextMode: Mode = mode === "encode" ? "decode" : "encode";
    const nextInput = output.startsWith("⚠") ? "" : output;
    setMode(nextMode);
    setInput(nextInput);
  };

  return (
    <div className="demo">
      <div className="demo-bar">
        <span className="demo-dot"></span>
        <span className="demo-dot"></span>
        <span className="demo-dot"></span>
        <span className="demo-title">thử ngay — base64</span>
      </div>
      <div className="demo-body">
        <div className="demo-col">
          <label>{mode === "encode" ? "TEXT" : "BASE64"}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Gõ gì đó vào đây..."
          />
        </div>
        <div className="demo-mid">
          <button className="demo-arrow" onClick={() => setOutput(convert(mode, input))} title="Chuyển đổi">
            →
          </button>
          <span className="demo-mode" onClick={swap}>
            {mode}
          </span>
        </div>
        <div className="demo-col">
          <label>{mode === "encode" ? "BASE64" : "TEXT"}</label>
          <textarea value={output} readOnly placeholder="Kết quả..." />
        </div>
      </div>
    </div>
  );
}
