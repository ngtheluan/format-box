"use client";
import type { ImageCandidate } from "@/lib/blog-ai-shared";
import { IconLoader2, IconPhotoSearch, IconSearch, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  initialQuery: string;
  onPick: (c: ImageCandidate) => void;
  onClose: () => void;
};

// Search Unsplash / Openverse and pick a photo (cover or inline image).
export default function ImagePicker({ title, initialQuery, onPick, onClose }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [source, setSource] = useState<"unsplash" | "openverse">("unsplash");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ImageCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const reqId = useRef(0);

  async function search(query: string, src: typeof source, p: number) {
    if (!query.trim()) return;
    const id = ++reqId.current;
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`/api/blog/images?q=${encodeURIComponent(query)}&source=${src}&page=${p}`);
      const j = await r.json();
      if (id !== reqId.current) return;
      if (!r.ok) throw new Error(j?.error || `Lỗi ${r.status}`);
      setItems((prev) => (p === 1 ? j.images : [...prev, ...j.images]));
      if (!j.images.length && p === 1) setErr("Không có ảnh — thử từ khoá tiếng Anh cụ thể hơn.");
    } catch (e: any) {
      setErr(e?.message || "Lỗi");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    search(initialQuery, "unsplash", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(src = source) {
    setPage(1);
    search(q, src, 1);
  }

  function pick(c: ImageCandidate) {
    if (c.downloadLocation) {
      fetch("/api/blog/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadLocation: c.downloadLocation }),
      }).catch(() => {});
    }
    onPick(c);
  }

  return (
    <div className="fx-modal-bg" style={{ zIndex: 260 }} onClick={onClose}>
      <div className="fx-modal" style={{ maxWidth: 920, width: "95vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="fx-modal-head">
          <h2>
            <IconPhotoSearch size={16} stroke={2} /> {title}
          </h2>
          <button className="fx-btn fx-btn-icon fx-btn-ghost" onClick={onClose}>
            <IconX size={16} stroke={2} />
          </button>
        </div>
        <div className="fx-modal-body">
          <div className="bga-picker-bar">
            <div className="bga-seg">
              {(["unsplash", "openverse"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={source === s ? "is-on" : ""}
                  onClick={() => {
                    setSource(s);
                    submit(s);
                  }}
                >
                  {s === "unsplash" ? "Unsplash" : "Openverse (CC)"}
                </button>
              ))}
            </div>
            <div className="fx-field" style={{ flex: 1, margin: 0 }}>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Từ khoá tiếng Anh, VD: developer laptop code"
              />
            </div>
            <button className="fx-btn fx-btn-primary" onClick={() => submit()} disabled={loading}>
              {loading ? <IconLoader2 size={14} className="spin" /> : <IconSearch size={14} />} Tìm
            </button>
          </div>
          {err && <div className="fx-err">{err}</div>}
          <div className="bga-picker-grid">
            {items.map((c) => (
              <button key={c.id} type="button" className="bga-picker-item" onClick={() => pick(c)} title={c.alt}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.thumb} alt={c.alt} loading="lazy" />
                <span>{c.credit}</span>
              </button>
            ))}
            {loading &&
              items.length === 0 &&
              Array.from({ length: 9 }, (_, i) => <div key={i} className="bga-picker-item is-skel" />)}
          </div>
          {items.length > 0 && (
            <button
              className="fx-btn"
              style={{ justifySelf: "center" }}
              disabled={loading}
              onClick={() => {
                const p = page + 1;
                setPage(p);
                search(q, source, p);
              }}
            >
              {loading ? <IconLoader2 size={14} className="spin" /> : null} Xem thêm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
