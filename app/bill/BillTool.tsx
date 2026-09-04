"use client";
import { useToast } from "@/components/Toast";
import { vndInWords } from "@/lib/vndWords";
import {
  IconCalendar,
  IconClipboardList,
  IconCopy,
  IconDownload,
  IconHeartFilled,
  IconLink,
  IconPencil,
  IconPhotoUp,
  IconPlus,
  IconReceipt2,
  IconStarFilled,
  IconTrash,
  IconUser,
  IconUsers,
  IconUsersMinus,
  IconWallet,
  IconX,
} from "@tabler/icons-react";
import * as htmlToImage from "html-to-image";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";

type Person = { id: string; name: string };
type Item = { name: string; qty: number; price: number; excludes: string[] };

type BillData = {
  title: string;
  tag: string;
  date: string;
  splitType: string;
  payer: string;
  qrText: string;
  qrImage: string | null;
  brands: string[];
  footer: string;
  people: Person[];
  items: Item[];
};

const BANK_OPTIONS = ["MOMO"];

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_PEOPLE: Person[] = [
  { id: uid(), name: "G.Đại" },
  { id: uid(), name: "H.Đại" },
  { id: uid(), name: "Luân" },
  { id: uid(), name: "Hậu" },
  { id: uid(), name: "Khanh" },
  { id: uid(), name: "Ánh" },
  { id: uid(), name: "Duy" },
  { id: uid(), name: "Tâm" },
];

const DEFAULT_DATA: BillData = {
  title: "HÓA ĐƠN THANH TOÁN",
  tag: "CHI PHÍ CẦU LÔNG",
  date: new Date().toISOString().slice(0, 10),
  splitType: "Chia đều",
  payer: "NGUYỄN HOÀNG GIA ĐẠI",
  qrText: "",
  qrImage: "/bill-default-qr.png",
  brands: ["MOMO", "Vietinbank"],
  footer: "Cảm ơn mọi người đã cùng nhau vui vẻ và fair-play!",
  people: DEFAULT_PEOPLE,
  items: [
    { name: "Sân", qty: 2, price: 130000, excludes: [] },
    { name: "Cầu", qty: 4, price: 27000, excludes: [] },
    { name: "Nước", qty: 2, price: 25000, excludes: [] },
  ],
};

const fmt = new Intl.NumberFormat("vi-VN");

export default function BillTool() {
  const toast = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<BillData>(DEFAULT_DATA);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [openExclude, setOpenExclude] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(true);

  const total = useMemo(() => data.items.reduce((s, it) => s + it.qty * it.price, 0), [data.items]);
  const words = useMemo(() => vndInWords(total), [total]);

  // Per-person breakdown honoring exclusions
  const perPersonMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of data.people) map[p.id] = 0;
    if (data.people.length === 0) return map;
    for (const it of data.items) {
      const cost = it.qty * it.price;
      const eligible = data.people.filter((p) => !it.excludes.includes(p.id));
      if (eligible.length === 0) continue;
      const share = cost / eligible.length;
      for (const p of eligible) map[p.id] += share;
    }
    return map;
  }, [data.items, data.people]);

  const hasExclusions = data.items.some((it) => it.excludes.length > 0);
  const equalPerPerson = data.people.length > 0 ? Math.round(total / data.people.length) : 0;
  const perPersonRange = useMemo(() => {
    const vals = Object.values(perPersonMap);
    if (vals.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.round(Math.min(...vals)),
      max: Math.round(Math.max(...vals)),
    };
  }, [perPersonMap]);

  useEffect(() => {
    if (data.qrImage) {
      setQrDataUrl(data.qrImage);
      return;
    }
    if (!data.qrText.trim()) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(data.qrText, {
      margin: 1,
      width: 320,
      color: { dark: "#be185d", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => setQrDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [data.qrText, data.qrImage]);

  const update = <K extends keyof BillData>(key: K, value: BillData[K]) => setData((d) => ({ ...d, [key]: value }));

  const updateItem = (i: number, patch: Partial<Item>) =>
    setData((d) => ({
      ...d,
      items: d.items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
    }));
  const addItem = () =>
    setData((d) => ({
      ...d,
      items: [...d.items, { name: "", qty: 1, price: 0, excludes: [] }],
    }));
  const removeItem = (i: number) => setData((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }));

  const toggleItemExclude = (itemIdx: number, personId: string) =>
    setData((d) => ({
      ...d,
      items: d.items.map((it, i) => {
        if (i !== itemIdx) return it;
        const has = it.excludes.includes(personId);
        return {
          ...it,
          excludes: has ? it.excludes.filter((x) => x !== personId) : [...it.excludes, personId],
        };
      }),
    }));

  // Number input helper: never clears to empty; ignores invalid input
  const numHandler =
    (setter: (n: number) => void, min = 0) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === "") return; // keep previous value
      const n = Number(raw);
      if (!Number.isFinite(n)) return;
      setter(Math.max(min, n));
    };

  const addPerson = () =>
    setData((d) => ({
      ...d,
      people: [...d.people, { id: uid(), name: `Người ${d.people.length + 1}` }],
    }));
  const updatePerson = (id: string, name: string) =>
    setData((d) => ({
      ...d,
      people: d.people.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  const removePerson = (id: string) => {
    if (data.people.length <= 1) {
      toast("Cần ít nhất 1 người");
      return;
    }
    setData((d) => ({
      ...d,
      people: d.people.filter((p) => p.id !== id),
      items: d.items.map((it) => ({ ...it, excludes: it.excludes.filter((x) => x !== id) })),
    }));
  };

  const handleQrUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Chỉ hỗ trợ file ảnh");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("qrImage", String(reader.result));
    reader.readAsDataURL(file);
  };

  const toggleBrand = (b: string) =>
    setData((d) => ({
      ...d,
      brands: d.brands.includes(b) ? d.brands.filter((x) => x !== b) : [...d.brands, b],
    }));

  const withoutEditing = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setEditing(false);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      return await fn();
    } finally {
      setEditing(true);
    }
  };

  const download = async () => {
    if (!previewRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await withoutEditing(() =>
        htmlToImage.toPng(previewRef.current!, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#ffffff",
        }),
      );
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `bill-${data.date}.png`;
      a.click();
      toast("Đã tải bill");
    } catch {
      toast("Xuất ảnh thất bại");
    } finally {
      setBusy(false);
    }
  };

  const copyImage = async () => {
    if (!previewRef.current) return;
    setBusy(true);
    try {
      const blob = await withoutEditing(() =>
        htmlToImage.toBlob(previewRef.current!, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#ffffff",
        }),
      );
      if (!blob) throw new Error("no blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("Đã copy ảnh vào clipboard");
    } catch {
      toast("Copy thất bại");
    } finally {
      setBusy(false);
    }
  };

  const ec = editing ? "bill-ec" : "bill-ec bill-ec-static";
  const dateDisplay = formatDate(data.date);
  const nameOf = (id: string) => data.people.find((p) => p.id === id)?.name ?? "?";

  return (
    <div className="bill-standalone">
      <div className="bill-preview" ref={previewRef} data-editing={editing ? "1" : "0"}>
        <div className="bill-inner">
          <div className="bill-header">
            <div className="bill-mark">
              <IconReceipt2 size={34} stroke={1.6} />
            </div>
            <h1>
              <input
                className={`${ec} bill-ec-title`}
                value={data.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="HÓA ĐƠN THANH TOÁN"
              />
            </h1>
            <div className="bill-tag">
              <input
                className={`${ec} bill-ec-tag`}
                value={data.tag}
                onChange={(e) => update("tag", e.target.value)}
                placeholder="CHI PHÍ..."
              />
            </div>
            <div className="bill-divider">
              <span />
              <IconStarFilled size={10} />
              <span />
            </div>
          </div>

          <div className="bill-meta">
            <div className="bill-meta-left">
              <MetaRow icon={<IconCalendar size={16} stroke={1.7} />} label="Ngày thanh toán">
                {editing ? (
                  <input
                    type="date"
                    className={`${ec} bill-ec-date`}
                    value={data.date}
                    onChange={(e) => update("date", e.target.value)}
                  />
                ) : (
                  <span className="bill-meta-value">{dateDisplay}</span>
                )}
              </MetaRow>

              <MetaRow icon={<IconUsers size={16} stroke={1.7} />} label="Số người tham gia">
                <span className="bill-meta-value">{data.people.length}</span>
              </MetaRow>

              <MetaRow icon={<IconClipboardList size={16} stroke={1.7} />} label="Hình thức">
                <input
                  className={ec}
                  value={data.splitType}
                  onChange={(e) => update("splitType", e.target.value)}
                  placeholder="Chia đều"
                />
              </MetaRow>

              <MetaRow icon={<IconUser size={16} stroke={1.7} />} label="Người thanh toán">
                <input
                  className={`${ec} bill-ec-upper`}
                  value={data.payer}
                  onChange={(e) => update("payer", e.target.value.toUpperCase())}
                  placeholder="Nhập tên..."
                />
              </MetaRow>
            </div>

            <div className="bill-qr">
              <div className="bill-qr-head">QUÉT MÃ THANH TOÁN</div>
              <div className="bill-qr-brands">{data.brands.length ? data.brands.join(" · ") : " "}</div>
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR" />
              ) : (
                <div className="bill-qr-empty">
                  <IconLink size={22} stroke={1.4} />
                  <span>Chưa có QR</span>
                </div>
              )}
              {hasExclusions ? (
                perPersonRange.min === perPersonRange.max ? (
                  <div className="bill-qr-amount">{fmt.format(perPersonRange.max)}đ</div>
                ) : (
                  <div className="bill-qr-amount bill-qr-amount-range">
                    <small>Mỗi người</small>
                    {fmt.format(perPersonRange.min)}
                    <span> – </span>
                    {fmt.format(perPersonRange.max)}đ
                  </div>
                )
              ) : (
                <div className="bill-qr-amount">{fmt.format(equalPerPerson)}đ</div>
              )}

              {editing && (
                <div className="bill-qr-edit">
                  <div className="bill-qr-actions">
                    <button type="button" className="bill-qr-toggle" onClick={() => setShowQrPanel((v) => !v)}>
                      <IconPencil size={11} stroke={2} />
                      {showQrPanel ? "Ẩn" : "Chỉnh QR"}
                    </button>
                    {data.qrImage && (
                      <button
                        type="button"
                        className="bill-qr-toggle bill-qr-toggle-danger"
                        onClick={() => update("qrImage", null)}
                        title="Xoá ảnh QR đã upload"
                      >
                        <IconX size={11} stroke={2} /> Xoá ảnh
                      </button>
                    )}
                  </div>

                  {showQrPanel && (
                    <div className="bill-qr-panel">
                      <label className="bill-qr-panel-label">Ngân hàng / ví hiển thị</label>
                      <div className="bill-qr-brand-chips">
                        {BANK_OPTIONS.map((b) => (
                          <button
                            key={b}
                            type="button"
                            className={`bill-qr-chip${data.brands.includes(b) ? " on" : ""}`}
                            onClick={() => toggleBrand(b)}
                          >
                            {b}
                          </button>
                        ))}
                      </div>

                      <label className="bill-qr-panel-label">Ảnh QR (upload)</label>
                      <button type="button" className="bill-qr-upload" onClick={() => qrFileRef.current?.click()}>
                        <IconPhotoUp size={14} stroke={1.8} />
                        {data.qrImage ? "Đổi ảnh khác" : "Chọn ảnh QR"}
                      </button>
                      <input
                        ref={qrFileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => handleQrUpload(e.target.files?.[0])}
                      />

                      {!data.qrImage && (
                        <>
                          <label className="bill-qr-panel-label">Hoặc dán link để tạo QR</label>
                          <input
                            className="bill-qr-input"
                            value={data.qrText}
                            onChange={(e) => update("qrText", e.target.value)}
                            placeholder="https://... hoặc chuỗi VietQR"
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* People panel — only visible while editing */}
          {editing && (
            <div className="bill-people">
              <div className="bill-people-head">
                <IconUsers size={14} stroke={1.8} />
                <span>Người tham gia</span>
                <button type="button" className="bill-people-add" onClick={addPerson}>
                  <IconPlus size={12} stroke={2} /> Thêm
                </button>
              </div>
              <div className="bill-people-chips">
                {data.people.map((p) => (
                  <span className="bill-person-chip" key={p.id}>
                    <input value={p.name} onChange={(e) => updatePerson(p.id, e.target.value)} placeholder="Tên" />
                    <button type="button" onClick={() => removePerson(p.id)} aria-label="Xoá" title="Xoá">
                      <IconX size={11} stroke={2.2} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <table className="bill-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>NỘI DUNG</th>
                <th>SL</th>
                <th>ĐƠN GIÁ</th>
                <th>THÀNH TIỀN</th>
                {editing && <th className="bill-th-act" aria-label=""></th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <input
                      className={`${ec} bill-ec-name`}
                      value={it.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      placeholder="Nhập tên..."
                    />
                    {it.excludes.length > 0 && (
                      <div className="bill-item-excludes">Không tính: {it.excludes.map(nameOf).join(", ")}</div>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`${ec} bill-ec-num bill-ec-right`}
                      value={it.qty}
                      onChange={numHandler((n) => updateItem(i, { qty: n }), 0)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`${ec} bill-ec-num bill-ec-right`}
                      value={it.price}
                      onChange={numHandler((n) => updateItem(i, { price: n }), 0)}
                    />
                  </td>
                  <td className="bill-td-total">{fmt.format(it.qty * it.price)}</td>
                  {editing && (
                    <td className="bill-td-act">
                      <div className="bill-td-act-wrap">
                        <button
                          className={`bill-row-ex${it.excludes.length ? " on" : ""}`}
                          onClick={() => setOpenExclude((cur) => (cur === i ? null : i))}
                          title="Loại người khỏi item này"
                          type="button"
                        >
                          <IconUsersMinus size={13} stroke={1.9} />
                        </button>
                        <button className="bill-row-del" onClick={() => removeItem(i)} title="Xoá" type="button">
                          <IconTrash size={13} stroke={1.9} />
                        </button>

                        {openExclude === i && (
                          <div className="bill-exclude-pop" onClick={(e) => e.stopPropagation()}>
                            <div className="bill-exclude-head">Không tính cho:</div>
                            {data.people.length === 0 && <div className="bill-exclude-empty">Chưa có ai</div>}
                            {data.people.map((p) => {
                              const on = it.excludes.includes(p.id);
                              return (
                                <label key={p.id} className={`bill-exclude-row${on ? " on" : ""}`}>
                                  <input type="checkbox" checked={on} onChange={() => toggleItemExclude(i, p.id)} />
                                  <span>{p.name}</span>
                                </label>
                              );
                            })}
                            <button type="button" className="bill-exclude-close" onClick={() => setOpenExclude(null)}>
                              Xong
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {editing && (
                <tr className="bill-tr-add">
                  <td colSpan={6}>
                    <button className="bill-add-btn" onClick={addItem} type="button">
                      <IconPlus size={13} stroke={2} /> Thêm item
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="bill-total">
            <div>
              <div className="bill-total-label">
                <IconWallet size={18} stroke={1.8} /> TỔNG CỘNG
              </div>
              <div className="bill-total-words">(Bằng chữ): {words}</div>
            </div>
            <div className="bill-total-num">{fmt.format(total)}đ</div>
          </div>

          <div className="bill-summary">
            <div className="bill-summary-row">
              <span>Tổng chi phí:</span>
              <b>{fmt.format(total)}đ</b>
            </div>
            <div className="bill-summary-row">
              <span>Số người tham gia:</span>
              <b>{data.people.length} người</b>
            </div>
            <div className="bill-summary-divider" />
            {!hasExclusions ? (
              <div className="bill-summary-row bill-summary-big">
                <span>CHI PHÍ MỖI NGƯỜI:</span>
                <b>{fmt.format(equalPerPerson)}đ</b>
              </div>
            ) : (
              <>
                <div className="bill-summary-row bill-summary-big">
                  <span>CHIA THEO NGƯỜI:</span>
                  <b>(có ngoại lệ)</b>
                </div>
                <div className="bill-breakdown">
                  {data.people.map((p) => (
                    <div className="bill-breakdown-row" key={p.id}>
                      <span>{p.name}</span>
                      <b>{fmt.format(Math.round(perPersonMap[p.id] || 0))}đ</b>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bill-footer">
            <div className="bill-footer-hi">
              Cảm ơn mọi người <IconHeartFilled size={16} style={{ color: "#db2777" }} />
            </div>
            <div className="bill-footer-msg">
              <input
                className={`${ec} bill-ec-footer`}
                value={data.footer}
                onChange={(e) => update("footer", e.target.value)}
                placeholder="Lời nhắn (tuỳ chọn)..."
              />
            </div>
            <div className="bill-footer-cta">
              <IconStarFilled size={12} /> Chơi hết mình – Thanh toán văn minh <IconStarFilled size={12} />
            </div>
          </div>
        </div>
      </div>

      <div className="bill-hint">
        <IconPencil size={13} stroke={1.9} /> Click vào bất kỳ ô nào để chỉnh sửa · dùng nút{" "}
        <IconUsersMinus size={12} stroke={1.9} /> ở mỗi item để loại người không tham gia
      </div>

      <div className="bill-cta-row">
        <button className="btn btn-s" onClick={copyImage} disabled={busy}>
          <IconCopy size={15} stroke={1.8} /> Copy ảnh
        </button>
        <button className="btn btn-p bill-download" onClick={download} disabled={busy}>
          <IconDownload size={16} stroke={1.8} />
          {busy ? "Đang xuất..." : "Tải ảnh PNG"}
        </button>
      </div>
    </div>
  );
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bill-meta-row">
      <span className="bill-meta-icon">{icon}</span>
      <b>{label}:</b>
      <span className="bill-meta-value">{children}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
